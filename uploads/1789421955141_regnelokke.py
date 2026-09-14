array = []

def skrivut():
    min = 0
    max = 0
    sum = 0
    utskriv = ""
    for i in range(0, len(array)):
        utskriv += array[i],", "
        sum += sum + array[i]
        if i < len(array)-1:
            if array[i] > array[i+1]:
                min == array[i+1]
                max == array[i]
            else:
                min == array[i]
                max == array[i+1]
    print(utskriv)
    print(sum)
    print(max)
    print(min)

def spørbruker():
    not0 = 0
    while(not0 == 0):
        x = int(input("Et tall? "))
        if x == 0:
            not0 = 1
            utskriv()
        array.append(x)
        
spørbruker()



        
