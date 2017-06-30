"use strict";

/**
 * Tuning parameters for the pattern finder algorithm.
 */

var MAX_PATTERN_LENGTH = 200,
    MIN_PATTERN_LENGTH = 4, // keep this above 0 to avoid pointlessly calculating the instances of the empty pattern.
    INTERVAL_DROPPED = -1,
    COMMON_SPAN_THRESHOLD = 0.75;

/**
 * This is a wrapper of a regular array, designed for the algorithm. In the algorithm, `list` 
 * consists of indices, each index corresponding to the interval [index, index + offset]. 
 */
var PointerList = function (offset, stackDepth, list) {
    this.offset = offset; 
    this.stackDepth = stackDepth; 
    this.list = list;
}

/**
 * This is our wrapper object for an interval that we find is a pattern. Note here, we are keeping track of 
 * the count of the pattern.
 */
var PatternFrame = function (start, end, count) {
    this.count = count;
    this.start = start; 
    this.end = end; 
}

/**
 * The main wrapper object for the main functions for the algorithm.
 */

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
 * when to completely drop an interval out during the extension process. If the current stack depth of
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

PatternFinder.prototype.processPointerList = function (pointerList) {
    // We cap the maximum length of a pattern to maintain scalability. 
    // Most patterns are no more than a few hundred, anyways.
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

    isPattern = (stackDepth == 0) && (offset >= MIN_PATTERN_LENGTH); 
        
    if (isPattern) {
        patternFrame = new PatternFrame(list[0], list[0] + offset, list.length);

        // We now drop out intervals which are a part of cluster. Note that we also want to find the
        // span of cluster. This is necessary for v2 of the algorithm.

        let inCluster = false,
            nextInCluster = false,
            curInterval = [];

        curPatternIntervals = [];
        patternSpan = 0;

        for (let i = 0; i < list.length; i++) {
            nextInCluster = false;
            if (i + 1 < list.length) {
                nextInCluster = (list[i + 1] - list[i]) <= offset; 
            }

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
                list[i] = INTERVAL_DROPPED; 
            }

            inCluster = nextInCluster;
        }
    }

    // This is where extension and partitioning of the patterns occur.

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

    // We now call pass these extended patterns for another iteration.

    // The return value of `PatternFinder.processPointerList` is the span of all patterns
    // extending pattern of the partition passed into as the parameter. We want to union
    // those intervals and use them for v3 of the algorithm.
    let extendedPatternIntervals = [];

    for (let [key, value] of partition) {
        let nextIntervals = this.processPointerList(value);
        for (let interval of nextIntervals) {
            extendedPatternIntervals.push(interval);
        }
    }

    if (isPattern) {
        // We need to find the intersect of the span of the extended patterns and the span of 
        // the current patterns. To do this, we must first sort and merge intervals making up the extended
        // patterns' span.
        extendedPatternIntervals.sort(function (a, b) {
            return a[0] - b[0];
        });

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

        // Here, we compute the span of the intersection.
        let intersectSpan = 0,
            i = 0, 
            j = 0; 

        while (i < curPatternIntervals.length && j < extended.length) {
            let cur = curPatternIntervals[i],
                ext = extended[j];

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

        // We make the decision to whether to accept or reject the pattern, and finish.
        if (intersectSpan/patternSpan < COMMON_SPAN_THRESHOLD) {
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
 * v1: Although v0 was elegant, the flaws were apparent. One of the most striking is that if a trace consists
 *     of a repeated sequence of events, instead of taking one instance and saying that the pattern occurred
 *     however many times, the algorithm also considers pairs and tripples of instances as patterns as well.
 *     When a new pattern is detected, v1 analyzes the different intervals of the pattern,
 *     and if there is a group of intervals such that the intervals intersect eachother, v1 considers
 *     the new pattern to be the fundamental pattern for that occurs in the whole regions spanned by the
 *     group, and drop these intervals out of the extension process. (Such a group is called a "cluster", and 
 *     indices spanned by the clusting is called the "span of the cluster". We can represent the span of a
 *     cluster with a set of intervals. We also refer to "span" is the total *length* spanned by these
 *     intervals. The meaning the "span" will be clear by context). The intuition here is that if we were
 *     to extend these intervals to other patterns, we would get more complex versions of the fundamental 
 *     pattern we just detected. Since this is undesirable, we drop these intervals out of the extension processes.
 *     The additions of v1 are located at the upper part of `PatternFinder.processPointerList`.
 * 
 * v2: This is a slightly more invovled modification than v1 was. A common occurance in a typical trace
 *     was where there would be a particular pattern would occur consecutively, but that pattern would be 
 *     built off of other patterns (with the same base function). Thus, v0 will count the number of instances
 *     of sub patterns, as well as the whole pattern. Now, this isn't completely ilogical; the sub pattern
 *     may occur in instances where the whole pattern may not. In practice, however, there are many times
 *     where the sub pattern mostly occurs within an instance of the whole pattern. The fundamental problem here
 *     is that when a new pattern is detected, it just so happens that when this pattern is extended to other
 *     patterns, these longer patterns have a total span that intersect the span of the current pattern to a
 *     large extent. Why count this current pattern if the longer patterns, more informative pattern encompasses
 *     this smaller pattern? There can be an argument that this smaller pattern is somehow fundamental to all 
 *     these extended patterns, and thus should be documented separately. However, in practice, these smaller
 *     patterns occur mainly in the context of one or a few big patterns, and it only adds clutter to add 
 *     these smaller patterns onto main list.
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
