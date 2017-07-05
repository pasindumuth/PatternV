"use strict";

const fs = require("fs");
const utils = require("./utils.js");
const RotateFilter = require("./Filters.js").RotateFilter;

/**
 * Tuning parameters for the pattern finder algorithm.
 */

var MAX_PATTERN_LENGTH = 200,
    MIN_PATTERN_LENGTH = 4, // keep this above 0 to avoid pointlessly considering the empty pattern.
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
 * This is our wrapper object for an interval that we find is a pattern. Note here, we are keeping 
 * track of the count of the pattern.
 */
var PatternFrame = function (start, end) {
    this.start = start; 
    this.end = end; 
    this.intervals;
    this.span;
    this.count; // when filters are applied, this number is meaningless.
}

/**
 * The main wrapper object for the main functions for the algorithm.
 */

var PatternFinder = function () {
    this.trace = [];
    this.patternFrames = [];
}

/**
 * Consider an interval of the form [x, y], where x and y are indices. We define it's corresponding 
 * subtrace to be the sequence of events (x, y] (that is,the sequence of events strictly after x, 
 * and before/on y) In order to get all instances of all patterns, we first note that any index in 
 * the trace can be the start of a pattern (except the exit of the root). To make this fact clear, 
 * we note that [x, x] is a pattern starting from x, which corresponds to the empty pattern. If this
 * seems confusing, just note that (x, x] is a subtrace (of zero elements) which is a complete 
 * callstack (being *really* precise with our defintions, a complete call stack is a (possibly empty)
 * sequence of function entrances and exists such that if a function enters, there is an event afterwards 
 * where the function exists such that relative stack height from the function entrance to the 
 * function exit is be 0 (the relative stack height from event x to y is the height "gained from x", 
 * that is, the height counted from events strictly after x, and before/on y), and similary for when
 * a function exits). We will frequently identify a pattern by it's corresponding interval.
 * 
 * The idea of the algorithm is to start off with an array of the intervals of the form [x, x] for 
 * all indices x, and extend the second value step by step. In every extension, we would like to 
 * partition the set of intervals so that the corresponding subtraces of intervals in a partition 
 * remain the same. This process is a matter of taking the events at the new ends of all the intevals 
 * in the original set, and using it as a key in a hashmap which maps these new end events to the 
 * subset of all (extended) intervals which also have this event for their new end. We observe that 
 * during this process, not only does a partition of intervals have a common subtrace, but *all* 
 * intervals in the whole trace that correspond to this subtrace will be present in this partition. 
 * This is the key property that allows us to find all instances of a pattern in the trace.
 * 
 * For each partition, we maintain the relative stack depth of the subtrace. Since a subtrace is a
 * pattern if and only if the relative stack depth is 0, we know exactly when to add a pattern into
 * our collection of patterns (which we represent by a particular interval in the partition). Using 
 * the stack depth, we also know when to completely drop an interval out during the extension process. 
 * If the current stack depth of on interval is zero, and the next event is an exit, this exit must 
 * be the exit out of the base function of this subrace, and thus this interval can no longer 
 * correspond to a pattern. This is how this algorithm terminates.
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
    // Most patterns are no more than a few hundred events, anyways.
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
        patternFrame = new PatternFrame(list[0], list[0] + offset);
        patternFrame.count = list.length;

        // The following processessing is for v1 and v2 of the algorithm. Here, we drop out 
        // intervals which are a part of a cluster (for v1). In addition 
        // we also find the span of the current pattern (for v2).

        let inCluster = false,
            nextInCluster = false,
            curInterval = [];

        // This is the span of the current pattern, defined as the set of all intervals it occurs on.
        curPatternIntervals = [];

        // This is the span of the current pattern, defined as the sum of the lengths of the above 
        // intervals. Just a reminder that we use the term "span" interchangably between these 
        // two defintions.
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

        patternFrame.intervals = curPatternIntervals;
        patternFrame.span = patternSpan;
    }

    // This is where the extension and partitioning of the current subtrace occurs.

    offset++;
    let partition = new Map(); 

    for (let i = 0; i < list.length; i++) {
        if (list[i] == INTERVAL_DROPPED) {
            continue;
        }

        let patternStart = list[i];
        let event = this.trace[patternStart + offset].split(":");
        if (stackDepth == 0 && event[0] == "exit") {
            continue;
        }

        let key = this.trace[patternStart + offset];
        if (!partition.has(key)) {
            let newStackDepth; 
            if (event[0] == "enter") {
                newStackDepth = stackDepth + 1; 
            } else {
                newStackDepth = stackDepth - 1;
            }

            let newPointerList = new PointerList(offset, newStackDepth, []);
            partition.set(key, newPointerList);
        }

        partition.get(key).list.push(patternStart); 
    }

    // We now do a recursive call to this function. This results in another iteration of the
    // extension-partition processes.

    // The return value of `PatternFinder.processPointerList` is the span of all patterns which
    // extend an interval of the partition passed into the function as a parameter. We want to find
    // the union those intervals and use them for v3 of the algorithm.
    let extendedPatternIntervals = [];

    for (let [key, value] of partition) {
        let nextIntervals = this.processPointerList(value);
        for (let interval of nextIntervals) {
            extendedPatternIntervals.push(interval); // This can be expensive in memory.
        }
    }

    if (isPattern) {
        // We need to find the intersect of the span of the extended patterns and the span of 
        // the current pattern. To do this, we must first sort and merge the intervals of the span
        // of extended patterns.
        extendedPatternIntervals.sort(function (a, b) {
            return a[0] - b[0];
        });

        extendedPatternIntervals = utils.squishIntervals(extendedPatternIntervals);

        // We now compute the span of the intersection.
        let intersectSpan = utils.intersectSpan(curPatternIntervals, extendedPatternIntervals);

        // Finally, we make the decision whether to accept or reject the pattern, and then finish.
        if (intersectSpan/patternSpan < COMMON_SPAN_THRESHOLD) {
            this.patternFrames.push(patternFrame);
        }

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
 * a strong condition for the input rawTrace). In order to detect a pattern, the algorithm relies 
 * that it be planted on top of some base function (although, by definition, a pattern doesn't 
 * strictly need one). Since the rawTrace can be a *sequence* of complete callstacks, and thus a 
 * sequence of patterns, it will be necessary to place all these patterns on top of a "root" 
 * function so that the algorithm can detect them. This is what `PatternFinder.createTrace` does. 
 * 
 * The `trace` will be an array of events, where each event is an ordered pair, where the second 
 * value is a function name, and the first value is an entrace or exit. (Note that we include the 
 * entrance exit of the root function). Thus, we note that the `trace` indexes the events starting
 * from 0. Since the indices of the trace correspond bijectively to an event, in our terminology, 
 * we sometimes use the term "index" and "event" interchangably.
 */

PatternFinder.prototype.createTrace = function (rawTrace) {
    rawTrace.unshift("enter:root");
    rawTrace.push("exit:root");
    this.trace = rawTrace;

    return this.trace;
}


/**
 * In order to describe the algorithm, we will describe different parts of the code based on when 
 * it was added, and what purpose it provided. We will refer to different stages of the algorithm's 
 * evolutions by its "version", e.g. version 0, version 1, etc. For short, we will use v0, v1, etc. 
 * We summarize the versions: 
 * 
 * v0: The first goal was to be given a trace (an array of entrances and exists of functions), and 
 *     find all of the different kinds of patterns in that trace, and all instances of when each 
 *     one occurs. See the comment for `PatternFinder.createTrace` for more details about the 
 *     definition of a pattern. To do this, we used a recursive algorithm. See 
 *    `PatternProcessor.findPatterns` for details.
 * 
 * v1: Although v0 was elegant, the flaws were apparent. One of the most striking is that if a trace
 *     consists of a sequence of events where a single pattern repeats over and over consecutively, 
 *     instead of taking one instance and saying that the pattern occurrs however many times, the 
 *     algorithm also considers pairs and triples of this patterns as new different patterns as well.
 *     To combat this issue, when a new pattern is detected, v1 analyzes the different intervals the
 *     pattern occurs on, and if there is a group of intervals such that each interval intersects at
 *     least one other interval in the group, v1 considers the current pattern to be the fundamental 
 *     building block that occurs in the whole region spanned by the group, and subsequently drops 
 *     these intervals out of the extension process. (We call such a group a "cluster", and we call 
 *     the set of all events encompassed by the cluster the "span of the cluster". In general, we 
 *     define the "span of a pattern" as the set of all events that are included in all instances of 
 *     the pattern. The span of a  pattern can be expressed as a set of all intervals which 
 *     correspond to the pattern. A potentially confusing point is that we also refer to the sum 
 *     of the length of these intervals as the "span of the pattern" as well. The definition which 
 *     is used should be clear by context). The intuition here is that if we were to extend these 
 *     intervals to other patterns, we would get more complex versions of the fundamental pattern 
 *     we just detected. Since this is undesirable, we drop these intervals out of the extension 
 *     processes.
 * 
 * v2: This is a slightly more invovled modification than v1. We noticed that a common occurance in 
 *     a typical trace was where there would be a particular pattern which would occur repeatedly 
 *     (as described in v1), but this pattern would itself be a sequence of smaller (distinct)
 *     patterns (perhaps 3 or 4 smaller patterns). Thus, v0 would count the number of instances
 *     of each of *these* patterns (which we call sub patterns), as well as the number of instances
 *     of the whole pattern. Now, this isn't completely illogical; a sub pattern may occur in 
 *     instances independent of the whole pattern. In practice, however, many times, a sub pattern 
 *     would occur only within an instance of the whole pattern (or at least approximately so). The 
 *     fundamental problem here is that when a pattern is detected, it may be the case that when
 *     this pattern is extended to other patterns, these longer patterns have a total span that 
 *     encompasses the span of the current pattern (or at least to a large extent). Why count 
 *     this current pattern if the longer patterns, more informative pattern encompasses this 
 *     smaller pattern? There can be an argument that this smaller pattern is somehow fundamental
 *     to all these extended patterns, and thus should be acounted for separately. However, in 
 *     practice, these smaller patterns only occur in instances of a few bigger patterns, and 
 *     thus rendering it unnecessary to add this smaller pattern to our collection.
 */


fs.readFile("../data/data/processed_data", "utf-8", function (err, textData) {
    if (err) {
        console.log(err);
    } else {
        execute(textData);
    }
});

var execute = function (textData) {
    let rawTrace = textData.split(",");

    console.log("Starting");
    let patternFinder = new PatternFinder();
    let trace = patternFinder.createTrace(rawTrace);
    patternFinder.findPatterns();

    console.log("Pattern Finding Finished");
    console.log(patternFinder.patternFrames.length);

    // I've begun to implement some filters for the patterns we are getting. This is still 
    // very rough around the edges. Toggle this boolean variable to turn on filters, which
    // will be applied to patternFinder.patternFrames after this point.
    let filtersOn = true;
    
    if (filtersOn) {
        let rotateFilter = new RotateFilter(trace, patternFinder.patternFrames);
        rotateFilter.filter();
        let filteredPatternFrames = rotateFilter.filteredPatternFrames;

        rotateFilter = null;
        patternFinder = null;

        console.log("RotateFilter Applied");
        console.log(filteredPatternFrames.length);
    }


    // patternFinder.patternFrames.sort(function (a, b) {
    //     return b.span - a.span;
    // });

    // for (let i = 0; i < 100; i++) {
    //     console.log(patternFinder.patternFrames[i].span/3000000);
    // }
}

/**
 * TODO: If memory is a problem, we can just break up the trace and process each
 * chunk separately.
 */