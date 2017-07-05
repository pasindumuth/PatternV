"use strict";

var PartialPattern = function (patternFrame) {
    this.patternFrame = patternFrame;
    this.length = patternFrame.end - patternFrame.start;
    this.partialStart;
    this.whole = false;
}

var PartialPatternFilter = function (trace) {
    this.trace = trace;
    this.patternFrames;
    this.partialPatterns = [];
    this.filteredPatternFrames = [];
}

// require all pattern frames to be non empty
PartialPatternFilter.prototype.createPartialPatterns = function (patternFrames) {
    this.patternFrames = patternFrames;
    for (let patternFrame of patternFrames) {
        let stackDepth = 0,
            length = patternFrame.end - patternFrame.start;

        let wholePattern = new PartialPattern(patternFrame);
        wholePattern.partialStart = 0; 
        wholePattern.whole = true;
        this.partialPatterns.push(wholePattern);

        for (let i = 1; i < length; i++) {
            let event = this.trace[patternFrame.start + i].split(":");
            if (event[0] == "enter") {
                stackDepth++;
            } else {
                stackDepth--;
            }

            if (stackDepth == 0) {
                let partialPattern = new PartialPattern(patternFrame); 
                partialPattern.partialStart = i;
                this.partialPatterns.push(partialPattern);
            }
        }
    }
}

PartialPatternFilter.prototype.filter = function () {
    if (this.partialPatterns.length == 0) {
        return;
    }
    
    this.filterR(this.partialPatterns, 0);

    for (let patternFrame of this.patternFrames) {
        if (patternFrame.valid) {
            this.filteredPatternFrames.push(patternFrame);
        }
    }
}

PartialPatternFilter.prototype.filterR = function (partialPatterns, offset) {
    let partition = new Map();
    let completed = [];
    offset++;
    for (let partialPattern of partialPatterns) {
        if (offset > partialPattern.length) {
            if (partialPattern.whole) {
                completed.push(partialPattern);                
            }
            continue;
        }
        
        let key = this.trace[partialPattern.partialStart + offset];
        if (!partition.has(key)) {
            partition.set(key, []);
        }
        partition.get(key).push(partialPattern);
    }

    for (let completedPattern of completed) {
        for (let partialPattern of partialPatterns) {
            if (partialPattern == completedPattern) {
                continue;
            }

            if (this.subInterval(completedPattern.patternFrame.intervals, partialPattern.patternFrame.intervals)) {
                completedPattern.patternFrame.valid = false;
            }
        }
    }

    for (let [key, value] of partition) {
        this.filterR(value, offset);
    }
}

// Note the intervals must be ascendingly ordered be start index
// TODO document that PatternFinder satisfies this.
PartialPatternFilter.prototype.subInterval = function (intervals1, intervals2) {
    let i = 0, 
        j = 0; 

    while (i < intervals1.length && j < intervals2.length) {
        let i1 = intervals1[i],
            i2 = intervals2[j];

        if (i1[0] < i2[0]) {
            return false;
        }

        if (i1[1] <= i2[1]) {
            i++;
        } else {
            j++;
        }
    }

    if (i != intervals1.length) {
        return false;
    } else {
        return true;
    }
}

module.exports = PartialPatternFilter;