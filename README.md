# FileVault — GitHub-Powered File Upload/Download

A sleek, dark-themed web app that uses a GitHub repository as its storage backend. Upload `.py`, `.zip`, and `.exe` files — no login required. Download anytime from anywhere.

## Setup

### 1. Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new)
2. Name it `file-share` (or whatever — just update `OWNER` and `REPO` in `js/app.js`)
3. Make it **Public**
4. Create it (no need to initialize with README)

### 2. Create a Fine-Grained Personal Access Token
1. Go to [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)
2. Click **Generate new token**
3. Give it a name like `filevault-upload`
4. Set **Repository access** → Only select repositories → choose your repo
5. Under **Permissions → Repository permissions**, enable:
   - **Contents**: Read and Write
6. Generate token and **copy it immediately**

### 3. Configure
Edit `js/app.js` and update the top of the file:
```js
const OWNER   = 'your-github-username';
const REPO    = 'file-share';
const GITHUB_TOKEN = 'ghp_...';
```

### 4. Deploy to GitHub Pages
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USER/file-share.git
git push -u origin main
```
Then go to **Settings → Pages → Source: Deploy from branch → `main` / `/ (root)`**

Your site will be live at `https://YOUR_USER.github.io/file-share/`

## File Rules
| Extension | Allowed |
|-----------|---------|
| `.py`     | Yes     |
| `.zip`    | Yes     |
| `.exe`    | Yes     |
| `.mp4`    | Blocked |
| `.mp3`    | Blocked |
| Others    | Blocked |

## Limitations
- **100 MB** max per file (GitHub API constraint)
- Token is embedded client-side (fine for personal use with scoped tokens)
- GitHub API rate limit: 5,000 requests/hour (authenticated)
