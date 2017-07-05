"use strict";

var RotatedPattern = function (patternFrame) {
    this.patternFrame = patternFrame;
    this.length = patternFrame.end - patternFrame.start;
    this.rotatedStart = 0;
    this.index  = 0; 
}

RotatedPattern.prototype.incrementIndex = function () {
    this.index++;
    if (this.index > this.length) {
        this.index = 1;
    }
}

var SubPatternFilter = function (trace) {
    this.trace = trace;
    this.patternFrames;
    this.rotatedPatterns = [];
    this.filteredPatternFrames = [];
}

// require all pattern frames to be non empty
SubPatternFilter.prototype.createRotatedPatterns = function (patternFrames) {
    this.patternFrames = patternFrames;
    for (let patternFrame of patternFrames) {
        let stackDepth = 0,
            length = patternFrame.end - patternFrame.start;

        for (let i = 1; i <= length; i++) {
            let event = this.trace[patternFrame.start + i].split(":");
            if (event[0] == "enter") {
                stackDepth++;
            } else {
                stackDepth--;
            }

            if (stackDepth == 0) {
                let rotatedPattern = new RotatedPattern(patternFrame);
                rotatedPattern.index = i; 
                rotatedPattern.incrementIndex();
                rotatedPattern.rotatedStart = rotatedPattern.index;
                rotatedPattern.length = length;
                this.rotatedPatterns.push(rotatedPattern);
            }
        }
    }
}

SubPatternFilter.prototype.filter = function () {
    if (this.rotatedPatterns.length == 0) {
        return;
    }
    
    this.filterR(this.rotatedPatterns);

    for (let patternFrame of this.patternFrames) {
        if (patternFrame.valid) {
            this.filteredPatternFrames.push(patternFrame);
        }
    }
}

SubPatternFilter.prototype.filterR = function (rotatedPatterns) {
    let partition = new Map();
    let completed = [];
    for (let rotatedPattern of rotatedPatterns) {
        rotatedPattern.incrementIndex();
        if (rotatedPattern.index == rotatedPattern.rotatedStart) {
            completed.push(rotatedPattern);
            continue;
        }
        
        let key = this.trace[rotatedPattern.patternFrame.start + rotatedPattern.index];
        if (!partition.has(key)) {
            partition.set(key, []);
        }
        partition.get(key).push(rotatedPattern);
    }

    for (let completedPattern of completed) {
        for (let rotatedPattern of rotatedPatterns) {
            if (completedPattern.patternFrame == rotatedPattern.patternFrame) {
                continue;
            }

            if (this.subInterval(completedPattern.patternFrame.intervals, rotatedPattern.patternFrame.intervals)) {
                completedPattern.patternFrame.valid = false;
            }
        }
    }

    for (let [key, value] of partition) {
        this.filterR(value);
    }
}

// Note the intervals must be ascendingly ordered be start index
// TODO document that PatternFinder satisfies this.
SubPatternFilter.prototype.subInterval = function (intervals1, intervals2) {
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
    }

    return true;
}