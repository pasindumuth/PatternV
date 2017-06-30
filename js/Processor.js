"use strict";

var EventObj = function () {
    this.functionName = null; 
    this.startIndex = null; 
    this.endIndex = null;
    this.depth = null;
}

var Processor = function () {
    this.functions = new Set();
    this.processors = [];
}

Processor.prototype.processPatternData = function (data, frame) {
    let processor = new PatternProcessor(),
        rawEvents = this.createRawEvents(data, frame);

    processor.processRawEvents(rawEvents); 
    processor.count = frame.count;
    this.processors.push(processor);

    for (let func of processor.functions) {
        this.functions.add(func);
    }
}

Processor.prototype.createRawEvents = function (data, frame) {
    let rawEvents = [];

    for (let i = frame.start + 1; i <= frame.end; i++) {
        let rawEventString = data[i]; 
        rawEvents.push(rawEventString.split(":"));
    }

    return rawEvents;
}

Processor.prototype.getPatterns = function () {
    let patterns = [];

    for (let i = 0; i < this.processors.length; i++) {
        patterns[i] = this.processors[i].getPatternProcessedData();
    }

    return patterns;
}

var PatternProcessor = function () {
    this.count; 
    this.functions = new Set();
    this.maxStackDepth = 0; 
    this.patternLength = 0; 

    // event processing variables
    this.eventStream = []
    this.processedEvents = []
}

PatternProcessor.prototype.processRawEvents = function (rawEvents) {

    // we subtract 1 because the final function exit does not show anything
    this.patternLength = rawEvents.length;

    for (let i = 0; i < rawEvents.length; i++) {
        let rawEvent = rawEvents[i];
        this.functions.add(rawEvent[1]);

        let curEvent;
        switch(rawEvent[0]) {
        case "enter": 
            curEvent = new EventObj(); 
            curEvent.functionName = rawEvent[1];
            curEvent.startIndex = i;
            curEvent.depth = this.eventStream.length + 1; 
            this.eventStream.push(curEvent); 
            break; 

        case "exit": 
            curEvent = this.eventStream.pop(); 
            curEvent.endIndex = i - 1; 
            this.processedEvents.push(curEvent);
            break;

        default: 
            console.log("Bad event");
        }

        if (this.maxStackDepth < this.eventStream.length) {
            this.maxStackDepth = this.eventStream.length;
        }
    }
}

PatternProcessor.prototype.getPatternProcessedData = function () {
    return  {
        count: this.count,
        maxStackDepth: this.maxStackDepth,
        patternLength: this.patternLength,
        processedEvents: this.processedEvents
    }
}
