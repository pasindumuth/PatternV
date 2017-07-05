"use strict";

let rawTrace = $("#p4").text().split(",");

let patternFinder = new PatternFinder();
let trace = patternFinder.createTrace(rawTrace);
patternFinder.findPatterns();
let patternFrames = patternFinder.patternFrames;
patternFinder = null;

let filtersOn = true;
if (filtersOn) {
    let partialPatternFilter = new PartialPatternFilter(trace);
    partialPatternFilter.createPartialPatterns(patternFrames);
    partialPatternFilter.filter();
    patternFrames = partialPatternFilter.filteredPatternFrames;
    partialPatternFilter = null;

    let rotateFilter = new RotateFilter(trace, patternFrames);
    rotateFilter.filter();
    patternFrames = rotateFilter.filteredPatternFrames;
    rotateFilter = null;
}


let processor = new Processor(); 
processor.processPatternData(trace, new PatternFrame(0, trace.length - 2, 1));
for (let i = 0; i < patternFrames.length; i++) {
    processor.processPatternData(trace, patternFrames[i]);  
}

let patterns = processor.getPatterns();

console.log(patterns.length);

if (!(patterns.length > 100)) {
    let renderer = new Renderer ($("#mainRenderContainer"), processor.functions);
    renderer.renderSinglePattern(patterns[0]); 
    for (let i = 1; i < patterns.length; i++) {
        renderer.renderMultiPattern(patterns[i]);
    }
    renderer.createMouseListener();
}

/**
 * TODO: 
 * 1. Clean up memory leaks. Reduce memory usage by constantly cleaning up.
 * 2. Avoid heirarchial repetition, even if the shallower patterns are slightly more numerous.
 * 4. Provide interface for better reporting metrics (intervals of occurance)
 * 6. Note that the processedEvents for all patterns are being buffered before rendering. Fix that.
 */