"use strict";

let rawTrace = $("#p4").text().split(",");

let patternFinder = new PatternFinder();
let trace = patternFinder.createTrace(rawTrace);
patternFinder.findPatterns();

let patternFrames;
let filtersOn = false;

patternFrames = patternFinder.patternFrames;

if (filtersOn) {
    let rotateFilter = new RotateFilter(trace, patternFinder.patternFrames);
    rotateFilter.filter();
    patternFrames = rotateFilter.filteredPatternFrames;

    rotateFilter = null;
}

patternFinder = null;


let processor = new Processor(); 
processor.processPatternData(trace, new PatternFrame(0, trace.length - 2, 1));
for (let i = 0; i < patternFrames.length; i++) {
    processor.processPatternData(trace, patternFrames[i]);  
}

let patterns = processor.getPatterns();

console.log(patterns.length);

let renderer = new Renderer ($("#mainRenderContainer"), processor.functions);
renderer.renderSinglePattern(patterns[0]); 
for (let i = 1; i < patterns.length; i++) {
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