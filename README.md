# PatternV

## About

PatternV is a massive trace analysis tool used for finding patterns in large traces. 
We focus primarily on detecting sequences of events which occur frequently throughout
the trace. We hope to find patterns that encompass essential processes, and thus reveal
where performance bottlenecks might lie.


## Getting started

The following instructions outline how to begin searching for patterns on a large trace.

1. First, we must provide the trace data, and process it into the desired format. Place
the trace data in the directory `./data/data/`. Then run the python script `./data/processor.py`. 
At the top of this file, you can configure the number of events you wish to process by 
adjusting the NUM_LINES constant. Whether you want a small trace for the purpose of developement, 
or a large trace for the purpose of evaluation, you can set NUM_LINES to whatever value
is appropriate.

2. The pattern finding algorithm is located in the file `./js/PatternFinder.js`. To start
processing the trace, simply run this script using Node.js.


## Running the Client Application

Currently, the client application is still in developement. To run the client, simply run 
index.html on your browser.

__NOTE__: The way which the client application currently gets its data is by having it 
embedded in an html element in index.html. This is a disgusting hack, and should be changed 
as soon as possible to facilitate scalable developement. One possibility is to create
a local connection between the browser and a Node.js server, and have the server read
in the trace data, find all the patterns, and render the final view before returning it
to the client.


## Documentation

The main documentation for the alogrithm is located in the file itself: `./js/PatternFinder.js`.
The program starts from when the data file is open and read, and thus the start of the documentation
is located there as well. 
