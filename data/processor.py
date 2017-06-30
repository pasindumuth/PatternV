"""
Process the data to a useable format. Set the NUM_LINES to the number of
lines which we want a well conditioned trace for (in this case,
"well conditioned" means a complete callstack).

"""

NUM_LINES = 3000000

trace = open("data/trace.bin.7.filtered.txt")
data = open("data/processed_data", "w")

stack = []

i = 0
while (i < NUM_LINES):
    line = trace.readline()
    event_line, _ = line.split("\n")
    event = event_line.split(" ")

    if (event[0] == "enter"):
        stack.append(event)
    else:
        stack.pop()
    
    string = event[0] + ":" + event[1] + ","
    data.write(string)
    
    i = i + 1

while (len(stack) > 1): 
    event = stack.pop()
    string = "exit:" + event[1] + ","
    data.write(string)

event = stack.pop()
string = "exit:" + event[1]
data.write(string)

print "pass"
print stack

