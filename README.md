# PatternV

## About

PatternV is a massive trace analysis tool which searches for subtraces with the property of 
being full function callstacks. We call these subtraces "patterns". PatternV can also
finds all instances of where such a pattern occurs, and thus provide insight into 
main structure of a trace.

## Getting started

The following are instructions on how to get started on running the main pattern 
finding algorithm on custom traces. 

1. Add the trace which is to be analyzed into the data/data directory. The script
data/processor.py will be responsible for taking this trace and writing it in the correct
format for the algorithm to a file called data/data/processed_data. One may have to scan 
the script and modify it so that it parses the input trace file correctly. At the top of
script is a parameter LINES, which indicate many events the processed trace should have
(this is useful when a large trace is provided, but smaller traces are desired for 
developement and testing purposes).

2. The program js/PatternFinder.js can be executed by running it with Node.js. This 
is the main algorithm which will find patterns in the processed trace in step 1. 

3. To understand the algorithm, start reading the documentation from the bottom of PatterFinder.js. 


## Running the Client Application

Currently, the client application is still in developement. To run the client, simply run 
index.html on your browser.

__NOTE__: The way which the client application currently gets it's data is by having it embedded
in an html element in index.html. This is a disgusting hack, but was sufficient for the developement
of the UI.