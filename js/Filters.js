"use strict";

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
            patternFrame.intervals = this.merge(patternFrame.intervals, newIntervals);
            // console.log("here merging");
        }
        // console.log("(" + patternFrame.start.toString() + ", " + patternFrame.end.toString() + ")");


        patternFrame.span = this.calculateSpan(patternFrame.intervals);
        this.filteredPatternFrames.push(patternFrame);
    }

    for (let [key, value] of partition) {
        this.filterR(value);
    }
}

RotateFilter.prototype.merge = function (intervals1, intervals2) {
    if (intervals1.length == 0) {
        return intervals2;
    } 

    if (intervals2.length == 0) {
        return intervals1;
    }

    if (intervals1[0][0] > intervals2[0][0]) {
        let temp = intervals1;
        intervals1 = intervals2; 
        intervals2 = temp;
    }

    let newIntervals = [];
    newIntervals.push(intervals1[0]);
    
    let i = 1,
        j = 0;

    while (i < intervals1.length && j < intervals2.length) {
        let lastInterval = newIntervals[newIntervals.length - 1],
            i1 = intervals1[i],
            i2 = intervals2[j];

        if (i1[0] < i2[0]) {
            if (i1[0] <= lastInterval[1]) {
                lastInterval[1] = Math.max(lastInterval[1], i1[1]);
            } else {
                newIntervals.push(i1);
            }

            i++;
        } else {
            if (i2[0] <= lastInterval[1]) {
                lastInterval[1] = Math.max(lastInterval[1], i2[1]);
            } else {
                newIntervals.push(i2);
            }

            j++;
        }
    }

    let lastInterval = newIntervals[newIntervals.length - 1];
    while (i < intervals1.length) {
        let i1 = intervals1[i];
        if (lastInterval[1] < i1[0]) {
            while (i < intervals1.length) {
                newIntervals.push(intervals1[i]);
                i++;
            }

            break;
        } else {
            lastInterval[1] = Math.max(lastInterval[1], i1[1]);
            i++;
        }
    }

    while (j < intervals2.length) {
        let i2 = intervals2[j];
        if (lastInterval[1] < i2[0]) {
            while (j < intervals2.length) {
                newIntervals.push(intervals2[j]);
                j++;
            }

            break;
        } else {
            lastInterval[1] = Math.max(lastInterval[1], i2[1]);
            j++;
        }
    }

    return newIntervals;
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