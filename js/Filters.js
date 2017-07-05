"use strict";

const utils = require("./utils.js");

var SortedPattern = function (patternFrame) {
    this.patternFrame = patternFrame;
    this.length = patternFrame.end - patternFrame.start;
    this.orderedStart = 0;
    this.index  = 0; 
}

SortedPattern.prototype.init = function () {
    if (this.length == 0) {
        console.log("bad pattern");
    }

    let lastEventLine = this.trace[this.patternFrame.start + 1];   
    this.orderedStart = this.length; 
    let stackDepth = 1;

    for (let i = 1; i < this.length; i++) {
        let eventLine = this.trace[this.patternFrame.start + i + 1];
        if (stackDepth == 0 && eventLine < lastEventLine) {
            lastEventLine = eventLine;
            this.orderedStart = i;
        }

        let event = eventLine.split(":");
        if (event[0] == "enter") {
            stackDepth++;
        } else {
            stackDepth--;
        }
    }

    this.index = this.orderedStart;
}

SortedPattern.prototype.incrementIndex = function () {
    this.index++;
    if (this.index > this.length) {
        this.index = 1;
    }
}

// Note that with this algorithm, we momentarily double the total number of pattern
// (interval) objects.

var RotateFilter = function (trace, patternFrames) {
    this.trace = trace;
    this.patternFrames = patternFrames;
    this.filteredPatternFrames = [];
}

RotateFilter.prototype.filter = function () {
    if (this.patternFrames.length == 0) {
        return;
    }

    SortedPattern.prototype.trace = this.trace;
    let patternList = [];
    
    for (let patternFrame of this.patternFrames) {
        let sortedPattern = new SortedPattern(patternFrame);
        sortedPattern.init();
        patternList.push(sortedPattern);
    }

    this.filterR(patternList);
}

RotateFilter.prototype.filterR = function (patternList) {
    if (patternList.length == 1) {
        this.filteredPatternFrames.push(patternList[0].patternFrame);
        return;
    }

    let partition = new Map();
    let completed = [];
    for (let sortedPattern of patternList) {
        sortedPattern.incrementIndex();
        if (sortedPattern.orderedStart == sortedPattern.index) {
            completed.push(sortedPattern);
            continue;
        }

        let key = this.trace[sortedPattern.patternFrame.start + sortedPattern.index];
        if (!partition.has(key)) {
            partition.set(key, []);
        }

        partition.get(key).push(sortedPattern);
    }

    if (completed.length > 0) {
        let patternFrame = completed[0].patternFrame;
        for (let i = 1; i < completed.length; i++) {
            let newIntervals = completed[i].patternFrame.intervals;
            patternFrame.intervals = utils.mergeIntervals(patternFrame.intervals, newIntervals);
        }


        patternFrame.span = this.calculateSpan(patternFrame.intervals);
        this.filteredPatternFrames.push(patternFrame);
    }

    for (let [key, value] of partition) {
        this.filterR(value);
    }
}

RotateFilter.prototype.calculateSpan = function (intervals) {
    let span = 0;
    for (let interval of intervals) {
        span += interval[1] - interval[0];
    }

    return span;
}

module.exports = {
    RotateFilter: RotateFilter
};