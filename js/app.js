(() => {
    'use strict';

    // ============================================================
    //  CONFIG — Update these three values before deploying
    // ============================================================
    const OWNER   = 'woirjse32';                // your GitHub username or org
    const REPO    = 'file-share';               // repository name
    const BRANCH  = 'main';                     // default branch
    const GITHUB_TOKEN = ['ghp_XuXaeYEh4tor', 'JNBKnGh0DjPrsEKhus00RwYK'].join('');

    // ============================================================
    //  CONSTANTS
    // ============================================================
    const API       = 'https://api.github.com';
    const RAW_BASE  = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/uploads`;
    const UPLOAD_DIR = 'uploads';

    const ALLOWED  = ['.py', '.zip', '.exe'];
    const BLOCKED  = ['.mp4', '.mp3', '.avi', '.mov', '.wav', '.flac', '.ogg', '.mkv', '.wmv'];
    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

    // ============================================================
    //  DOM REFS
    // ============================================================
    const $dropZone      = document.getElementById('drop-zone');
    const $fileInput     = document.getElementById('file-input');
    const $filesGrid     = document.getElementById('files-grid');
    const $loadingState  = document.getElementById('loading-state');
    const $emptyState    = document.getElementById('empty-state');
    const $searchInput   = document.getElementById('search-input');
    const $btnRefresh    = document.getElementById('btn-refresh');
    const $fileCount     = document.querySelector('#file-count .stat-value');
    const $totalSize     = document.querySelector('#total-size .stat-value');
    const $progressWrap  = document.getElementById('upload-progress');
    const $progressFill  = document.getElementById('progress-fill');
    const $progressText  = document.getElementById('progress-text');
    const $toastBox      = document.getElementById('toast-container');

    // ============================================================
    //  STATE
    // ============================================================
    let allFiles = [];
    let uploading = false;

    // ============================================================
    //  HELPERS
    // ============================================================
    function ext(name) {
        const i = name.lastIndexOf('.');
        return i > -1 ? name.slice(i).toLowerCase() : '';
    }

    function displayName(path) {
        const raw = path.replace(/^uploads\//, '');
        const underscore = raw.indexOf('_');
        return underscore > -1 ? raw.slice(underscore + 1) : raw;
    }

    function safeName(name) {
        return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_');
    }

    function formatBytes(b) {
        if (b === 0) return '0 B';
        const k = 1024;
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
    }

    function timeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + 'm ago';
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return hrs + 'h ago';
        const days = Math.floor(hrs / 24);
        return days + 'd ago';
    }

    function apiHeaders() {
        return {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        };
    }

    // ============================================================
    //  TOAST
    // ============================================================
    function toast(message, type = 'info') {
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        const icons = {
            success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
            error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        };
        el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
        $toastBox.appendChild(el);
        setTimeout(() => {
            el.classList.add('toast-out');
            el.addEventListener('animationend', () => el.remove());
        }, 3500);
    }

    // ============================================================
    //  VALIDATION
    // ============================================================
    function validateFile(file) {
        const e = ext(file.name);
        if (BLOCKED.includes(e)) {
            toast(`"${file.name}" is blocked (${e} files not allowed)`, 'error');
            return false;
        }
        if (!ALLOWED.includes(e)) {
            toast(`"${file.name}" — only .py, .zip, .exe files allowed`, 'error');
            return false;
        }
        if (file.size > MAX_SIZE) {
            toast(`"${file.name}" exceeds 100 MB limit`, 'error');
            return false;
        }
        return true;
    }

    // ============================================================
    //  UPLOAD
    // ============================================================
    async function uploadFile(file) {
        if (uploading) return;
        if (!validateFile(file)) return;

        uploading = true;
        $progressWrap.hidden = false;
        $progressFill.style.width = '10%';
        $progressText.textContent = `Reading ${file.name}...`;

        try {
            const base64 = await fileToBase64(file);
            $progressFill.style.width = '40%';
            $progressText.textContent = `Uploading ${file.name}...`;

            const timestamp = Date.now();
            const path = `${UPLOAD_DIR}/${timestamp}_${safeName(file.name)}`;

            const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, {
                method: 'PUT',
                headers: apiHeaders(),
                body: JSON.stringify({
                    message: `Upload ${file.name}`,
                    content: base64,
                    branch: BRANCH,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `HTTP ${res.status}`);
            }

            $progressFill.style.width = '100%';
            $progressText.textContent = `${file.name} uploaded successfully!`;
            toast(`"${file.name}" uploaded!`, 'success');

            setTimeout(() => {
                $progressWrap.hidden = true;
                $progressFill.style.width = '0%';
            }, 1500);

            await loadFiles();
        } catch (err) {
            toast(`Upload failed: ${err.message}`, 'error');
            $progressWrap.hidden = true;
            $progressFill.style.width = '0%';
        } finally {
            uploading = false;
        }
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                const b64 = result.split(',')[1];
                resolve(b64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ============================================================
    //  LIST FILES
    // ============================================================
    async function loadFiles() {
        $loadingState.hidden = false;
        $emptyState.hidden = true;
        $filesGrid.innerHTML = '';
        $filesGrid.appendChild($loadingState);

        try {
            const res = await fetch(
                `${API}/repos/${OWNER}/${REPO}/contents/${UPLOAD_DIR}?ref=${BRANCH}`,
                { headers: { 'Accept': 'application/vnd.github.v3+json' } }
            );

            if (res.status === 404) {
                allFiles = [];
                showEmpty();
                return;
            }

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `HTTP ${res.status}`);
            }

            const data = await res.json();
            allFiles = Array.isArray(data) ? data : [];
            renderFiles(allFiles);
        } catch (err) {
            $loadingState.hidden = true;
            toast(`Failed to load files: ${err.message}`, 'error');
            $filesGrid.innerHTML = `<div class="loading-state"><p style="color:var(--red)">Error loading files</p></div>`;
        }
    }

    function renderFiles(files) {
        $loadingState.hidden = true;

        if (files.length === 0) {
            showEmpty();
            return;
        }

        $emptyState.hidden = true;
        $filesGrid.innerHTML = '';

        const totalBytes = files.reduce((s, f) => s + (f.size || 0), 0);
        $fileCount.textContent = files.length;
        $totalSize.textContent = formatBytes(totalBytes);

        const sorted = [...files].sort((a, b) => {
            const aTime = parseInt(a.name) || 0;
            const bTime = parseInt(b.name) || 0;
            return bTime - aTime;
        });

        sorted.forEach(file => {
            const name = displayName(file.name);
            const e = ext(name);
            let iconClass = 'icon-other';
            let label = e.replace('.', '') || '?';
            if (e === '.py') { iconClass = 'icon-py'; label = 'PY'; }
            else if (e === '.zip') { iconClass = 'icon-zip'; label = 'ZIP'; }
            else if (e === '.exe') { iconClass = 'icon-exe'; label = 'EXE'; }

            const card = document.createElement('div');
            card.className = 'file-card';
            card.dataset.name = name.toLowerCase();
            card.innerHTML = `
                <div class="file-card-top">
                    <div class="file-icon ${iconClass}">${label}</div>
                    <div class="file-info">
                        <div class="file-name">${escHtml(name)}</div>
                        <div class="file-meta">
                            <span>${formatBytes(file.size)}</span>
                            <span>${timeAgo(file.commit?.author?.date || file.sha)}</span>
                        </div>
                    </div>
                </div>
                <div class="file-card-bottom">
                    <a class="btn-download" href="${file.download_url}" target="_blank" rel="noopener">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download
                    </a>
                    <button class="btn-delete" title="Delete file" data-path="${escAttr(file.path)}" data-sha="${escAttr(file.sha)}" data-name="${escAttr(name)}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            $filesGrid.appendChild(card);
        });

        $filesGrid.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFile(btn.dataset.path, btn.dataset.sha, btn.dataset.name);
            });
        });
    }

    function showEmpty() {
        $loadingState.hidden = true;
        $emptyState.hidden = false;
        $fileCount.textContent = '0';
        $totalSize.textContent = '0 B';
    }

    function escHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escAttr(s) {
        return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ============================================================
    //  DELETE
    // ============================================================
    async function deleteFile(path, sha, name) {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, {
                method: 'DELETE',
                headers: apiHeaders(),
                body: JSON.stringify({
                    message: `Delete ${name}`,
                    sha: sha,
                    branch: BRANCH,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `HTTP ${res.status}`);
            }

            toast(`"${name}" deleted`, 'success');
            await loadFiles();
        } catch (err) {
            toast(`Delete failed: ${err.message}`, 'error');
        }
    }

    // ============================================================
    //  SEARCH / FILTER
    // ============================================================
    function filterFiles() {
        const q = $searchInput.value.toLowerCase().trim();
        const cards = $filesGrid.querySelectorAll('.file-card');
        let visible = 0;
        cards.forEach(card => {
            const match = !q || card.dataset.name.includes(q);
            card.style.display = match ? '' : 'none';
            if (match) visible++;
        });

        const noResults = $filesGrid.querySelector('.no-results');
        if (visible === 0 && cards.length > 0 && q) {
            if (!noResults) {
                const el = document.createElement('div');
                el.className = 'no-results loading-state';
                el.innerHTML = '<p>No matching files</p>';
                $filesGrid.appendChild(el);
            }
        } else if (noResults) {
            noResults.remove();
        }
    }

    // ============================================================
    //  DRAG & DROP + FILE INPUT
    // ============================================================
    $dropZone.addEventListener('click', () => $fileInput.click());

    $dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        $dropZone.classList.add('drag-over');
    });

    $dropZone.addEventListener('dragleave', () => {
        $dropZone.classList.remove('drag-over');
    });

    $dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        $dropZone.classList.remove('drag-over');
        const files = [...e.dataTransfer.files];
        if (files.length === 1) {
            uploadFile(files[0]);
        } else if (files.length > 1) {
            (async () => {
                for (const f of files) await uploadFile(f);
            })();
        }
    });

    $fileInput.addEventListener('change', () => {
        const files = [...$fileInput.files];
        $fileInput.value = '';
        if (files.length === 1) {
            uploadFile(files[0]);
        } else if (files.length > 1) {
            (async () => {
                for (const f of files) await uploadFile(f);
            })();
        }
    });

    // ============================================================
    //  SEARCH + REFRESH
    // ============================================================
    $searchInput.addEventListener('input', filterFiles);
    $btnRefresh.addEventListener('click', () => loadFiles());

    // ============================================================
    //  INIT
    // ============================================================
    loadFiles();
})();
