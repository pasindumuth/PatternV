"use strict";

/**
 * Tuning parameters for the pattern finder algorithm.
 */

var MAX_PATTERN_LENGTH = 200;

/**
 * This is a wrapper of a regular array, designed for the algorithm. In the algorithm, `list` 
 * consists of indices, each index corresponding to the interval [index, index + offset]. 
 */
var PointerList = function (offset, stackDepth, list) {
    this.offset = offset; 
    this.stackDepth = stackDepth; 
    this.list = list;
}

var PatternFrame = function (start, end, count) {
    this.count = count;
    this.start = start; 
    this.end = end; 
}

var PatternFinder = function () {
    this.trace = [];
    this.patternFrames = [];
}

/**
 * Consider an interval of the for [x, y], where x and y are indices. We define it's corresponding 
 * subtrace to be the sequence of events (x, y] (that is,the sequnce of events strictly after x, 
 * and before/on y) In order to get all instances of all patterns, we first note that any 
 * index in the trace can be the start of a pattern (except the exit of the root). To make this
 * fact clear, we note that [x, x] corresponds to the empty pattern; a sequence of length 0, which is
 * indeed a subtrace such that it is a complete call stack and is thus a pattern starting from x (being 
 * *really* precise with our defintions, a complete call stack is a sequence of function entrances and exists 
 * such that if a function enters, there is an event where the function exists such that relative stack height 
 * from the function entrance to the function exit will be 0 (the relative stack height from event x to y is the 
 * height "gained from x", that is, the height counted from events strictly after x, and before/on y)). We will 
 * frequently identify a pattern by it's corresponding interval.
 * 
 * The idea of the algorithm is to start off with an array of the intervals of the form [x, x] for all indices x, and 
 * extend the second value step by step (by 1). In every extension, we would like to partition the set of intervals
 * so that the corresponding subtrace to all intervals in a partition remain the same. This process is a matter 
 * of taking the events at the new ends of all the events in the original set, and using it as a key in a 
 * hashmap which maps these new events to the subset of all (extended) intervals which also have this 
 * event for their new end. We observe that during this process, not only does a partition of intervals 
 * have a common subtrace, but *all* intervals in the whole trace that has this subtrace will be present in this
 * partition. This is the key property that allows us to find all instances of a pattern in the trace.
 * 
 * For each partition, we maintain the relative stack depth of the subtrace. Since a subtrace is a pattern
 * if and only if the relative stack depth is 0, we know exactly when to add a pattern into our collection
 * of patterns (which we represent by a particular interval in partition). Using the stack depth, also know 
 * when to completely drop an interval out during the partitioning process. If the current stack depth of
 * on interval is zero, and the next event is an exit, this exit must be the exit out of the base function 
 * of this subrace, and thus this interval can no longer correspond to a pattern.
 */

PatternFinder.prototype.findPatterns = function () {
    let pointerList = new PointerList(0, 0, []);

    for (let i = 0; i < this.trace.length - 1; i++) {
        pointerList.list.push(i);
    }
    
    this.processPointerList(pointerList)
}

/**
 * 
 */

PatternFinder.prototype.processPointerList = function (pointerList) {
    // When 
    if (pointerList.list.length <= 1 || pointerList.offset > MAX_PATTERN_LENGTH) {
        return [];
    }

    let offset = pointerList.offset,
        stackDepth = pointerList.stackDepth,
        list = pointerList.list,
        isPattern,
        curPatternIntervals,
        patternSpan,
        patternFrame;

    isPattern = (stackDepth == 0) && (offset != 0); // hack, since the empty is still a pattern, and we don't want to calculuate big stuff for it
        
    if (isPattern) {
        patternFrame = new PatternFrame(list[0], list[0] + offset, list.length);
        // this.patternFrames.push(patternFrame);

        // Prune off collections of pattern pointers which have another pattern pointers offset distance away. 
        // This means that the patterns overlap, and we no longer wish to account for how these overlapping
        // patterns extend to other patterns (since they will be redundant). We call groups of consecutive
        // pattern pointers with at least one other offset distance away a cluster.

        let inCluster = false,
            nextInCluster = false,
            curInterval = [];

        // This will be ordered by the start pointer (and the end pointer, since the intervals are disjoint)
        curPatternIntervals = [];
        patternSpan = 0;

        for (let i = 0; i < list.length; i++) {
            nextInCluster = false;
            if (i + 1 < list.length) {
                nextInCluster = (list[i + 1] - list[i]) <= offset; 
            }

            // We find all intervals where this pattern occured. This is useful for when we want to see
            // if the patterns find that extend this current pattern completely (or nearly) encompass
            // all instances of this pattern (in which case we want the more detailed pattern).

            if (inCluster == false && nextInCluster == false) {
                curInterval = [list[i], list[i] + offset];
                curPatternIntervals.push(curInterval);
                patternSpan += curInterval[1] - curInterval[0];
                curInterval = [];
            }
            if (inCluster == false && nextInCluster == true) {
                curInterval[0] = list[i];
            } else if (inCluster == true && nextInCluster == false) {
                curInterval[1] = list[i] + offset;
                curPatternIntervals.push(curInterval);
                patternSpan += curInterval[1] - curInterval[0];
                curInterval = [];
            }

            if (inCluster || nextInCluster) {
                list[i] = -1; 
            }

            inCluster = nextInCluster;
        }

        // console.log(curPatternIntervals);
    }

    offset++;
    let partition = new Map(); 

    for (let i = 0; i < list.length; i++) {
        if (list[i] == -1) {
            continue;
        }

        let patternStart = list[i];
        let lineObj = this.trace[patternStart + offset].split(":");
        if (stackDepth == 0 && lineObj[0] == "exit") {
            continue;
        }

        let key = this.trace[patternStart + offset];
        if (!partition.has(key)) {
            let newStackDepth; 
            if (lineObj[0] == "enter") {
                newStackDepth = stackDepth + 1; 
            } else {
                newStackDepth = stackDepth - 1;
            }

            let newPointerList = new PointerList(offset, newStackDepth, []);
            partition.set(key, newPointerList);
        }

        partition.get(key).list.push(patternStart); 
    }

    let extendedPatternIntervals = [];

    for (let [key, value] of partition) {
        let nextIntervals = this.processPointerList(value);
        for (let interval of nextIntervals) {
            extendedPatternIntervals.push(interval);
        }
    }

    if (isPattern) {
        extendedPatternIntervals.sort(function (a, b) {
            return a[0] - b[0];
        });

        // console.log(extendedPatternIntervals);

        let mergedExtended = [],
            extended = extendedPatternIntervals;

        for (let i = 0; i < extended.length; i++) {
            let curInterval = [];
            curInterval[0] = extended[i][0];
            while (i + 1 < extended.length && extended[i][1] >= extended[i + 1][0]) {
                i++;
            }
            curInterval[1] = extended[i][1];
            mergedExtended.push(curInterval);
        }

        extended = mergedExtended;

        // console.log(extended);

        let exspan = 0; 

        for (let i = 0; i < extended.length; i++) {
            let ext = extended[i];
            exspan += ext[1] - ext[0];
        }

        let intersectSpan = 0,
            i = 0, 
            j = 0; 

        while (i < curPatternIntervals.length && j < extended.length) {
            let cur = curPatternIntervals[i],
                ext = extended[j];
                
            if (cur[1] < cur[0]) {
                console.log("shitty cur");
            } else if (ext[1] < ext[0]) {
                console.log("shitty ext");
            }
            if (cur[0] < ext[0]) {
                if (ext[0] < cur[1]) {
                    if (ext[1] <= cur[1]) {
                        intersectSpan += ext[1] - ext[0];
                        j++;
                    } else {
                        intersectSpan += cur[1] - ext[0];
                        i++;
                    }
                } else {
                    i++;
                }
            } else {
                if (cur[0] < ext[1]) {
                    if (cur[1] <= ext[1]) {
                        intersectSpan += cur[1] - cur[0];
                        i++;
                    } else {
                        intersectSpan += ext[1] - cur[0];
                        j++;
                    }
                } else {
                    j++;
                }
            }
        }

        if (intersectSpan/patternSpan < 0.75) {
            this.patternFrames.push(patternFrame);
        }

        extendedPatternIntervals = extended;
        for (let interval of curPatternIntervals) {
            extendedPatternIntervals.push(interval);
        }
    }

    return extendedPatternIntervals;
}

/**
 * We *define* a pattern as a subtrace, with the property that it's a complete callstack. That is, 
 * the first event of the subtrace is an entrance into a function, and the last event is the 
 * corresponding exit from that function. Ideally, the rawTrace which is provided should itself
 * have the property that it's a complete callstack. However, in general this may not be the case. 
 * For now, we assume that the rawTrace is a *sequence* of such complete callstacks (which is still
 * a strong condition for the input rawTrace). In order to detect a pattern, the algorithm relies that 
 * it be planted on top of some base function, although, by definition, a pattern doesn't strictly need one. 
 * Since the rawTrace can be a *sequence* of complete callstacks, and thus a sequence of patterns, 
 * it will be necessary to place all these patterns ontop of a "root" function so that the algorithm
 * can detect them. This is what `PatternFinder.createTrace` does. 
 * 
 * The `trace` will be an array of events (including entrance and exit from the root function),
 * where each event is an ordered pair, where the second value is a function name, and the first 
 * value is if the function enters or exits on that event. Thus, we note that the `trace` indexes
 * the events starting from 0. Since the indices of the trace correspond bijectively to an event, 
 * in our terminology, we sometimes use the term "index" and "event" interchangably, since there is 
 * a bijective correspondence between them.
 */

PatternFinder.prototype.createTrace = function (rawTrace) {
    rawTrace.unshift("enter:root");
    rawTrace.push("exit:root");
    this.trace = rawTrace;

    return this.trace;
}


/**
 * In order to describe the algorithm, we will describe different parts of the code based on when 
 * it was added during the evolution of the algorithm, and what purpose it provided. We will
 * refer to different stages of the algorithms' evolutions by "version", e.g. version 0, version 1, etc. 
 * For short, we will use v0, v1, etc. We summarize the versions: 
 * 
 * v0: The first goal was to be given a trace (an array of entraces and exists of functions), and find
 *     all of the different kinds of patterns, and all instances of those patterns in the trace. 
 *     See the comment in `PatternFinder.createTrace` for more details of the definition of a pattern.
 *     To do this, we use a recursive algorithm. See `PatternProcessor.findPatterns` for how we take
 *     a trace, and find/count all patterns in it.
 * 
 */

const fs = require("fs");

fs.readFile("../data/data/processed_data", "utf-8", function (err, textData) {
    if (err) {
        console.log(err);
    } else {
        execute(textData);
    }
});

var execute = function (textData) {
    var rawTrace = textData.split(",");

    console.log("Starting");
    var patternFinder = new PatternFinder();
    patternFinder.createTrace(rawTrace);
    patternFinder.findPatterns();
    console.log("Pattern Finding Finished");
    console.log(patternFinder.patternFrames.length)
}

/**
 * Note the format of the textData, python script run, MAX_LINES
 */