"use strict";

var data4 = $("#p4").text().split(",");

var patternFinder = new PatternFinder();
var trace = patternFinder.createTrace(data4);
patternFinder.findPatterns();
// console.log("bottleneckpassed")
var patternFrames = patternFinder.patternFrames;

var processor = new Processor(); 
processor.processPatternData(trace, new PatternFrame(0, trace.length - 2, 1));
for (var i = 0; i < patternFrames.length; i++) {
    if (patternFrames[i].start + 4 < patternFrames[i].end) {
        processor.processPatternData(trace, patternFrames[i]);  
    }
}

var patterns = processor.getPatterns();

console.log(patterns.length);

var renderer = new Renderer ($("#mainRenderContainer"), processor.functions);
renderer.renderSinglePattern(patterns[0]); 
for (var i = 1; i < patterns.length; i++) {
    renderer.renderMultiPattern(patterns[i]);
}
renderer.createMouseListener();

/**
 * TODO: 
 * 1. Cap length of a pattern (and enforce any other necessary limitation) to ensure linear time and space. 
 * 2. Avoid heirarchial repetition, even if the shallower patterns are slightly more numerous.
 * 3. View the patterns in order, and report the number of instances.
 * 4. Provide interface for better reporting metrics (minimum pattern length, stack depth, etc).
 * 5. Do all this in layers for a good presentation.
 * 6. Note that the processedEvents for all patterns are being buffered before rendering. Fix that.
 */