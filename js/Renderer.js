"use strict";

var G_EVENT_HEIGHT = 12, //px
    G_EVENT_LENGTH = 6, //px
    G_LAYER_WIDTH = 30100, //px
    G_UPPER_PADDING = 50, //px
    G_LOWER_PADDING = 50, //px 
    G_LEFT_PADDING = 40; //px

var G_COUNT_BAR_WIDTH = 100,
    G_MULTIPATTERN_WIDTH = 30000;

var Layer = function (rootDiv, hoverInfoBar) {
    this.hoverInfoBar = hoverInfoBar;

    this.div = document.createElement("div");
    $(rootDiv).append(this.div);
    $(this.div).width("100%");
    $(this.div).addClass("rendererLayer");
    this.width = $(this.div).width();

    this.canvas = document.createElement("canvas");
    $(this.div).append(this.canvas);
    this.canvas.setAttribute("width", this.width);
    $(this.canvas).addClass("rendererLayerCanvas");
}

Layer.prototype.drawPattern = function (maxStackDepth, patternLength, processedEvents, functionToColor) {
    this.maxStackDepth = maxStackDepth;
    this.patternLength = patternLength;
    this.functionToColor = functionToColor;

    var xStart,
        yStart,
        xStartEvent, 
        yStartEvent,
        xLength, 
        context,
        event,
        i;

    // This is used for mouse listening
    this.gridToEvent = [];
    for (i = 0; i < this.patternLength; i++) {
        this.gridToEvent.push(new Array(maxStackDepth).fill(null));
    }

    this.height = G_UPPER_PADDING + G_LOWER_PADDING + G_EVENT_HEIGHT * this.maxStackDepth,
    this.canvas.setAttribute("height", this.height.toString());
    xStart = G_LEFT_PADDING;
    yStart = G_UPPER_PADDING + G_EVENT_HEIGHT * this.maxStackDepth;

    this.canvas.style.opacity = "0.8";
    context = this.canvas.getContext("2d");
    context.beginPath();
    context.rect(0, 0, this.width, this.height);
    context.fillStyle = "#eaeaea";
    context.fill();
    context.closePath();

    for (i = 0; i < processedEvents.length; i++) {
        event = processedEvents[i];
        this.logEventToGrid(event);
        context.beginPath(); 
        xStartEvent = xStart + event.startIndex * G_EVENT_LENGTH;
        yStartEvent = yStart - event.depth * G_EVENT_HEIGHT;
        xLength = G_EVENT_LENGTH * (event.endIndex - event.startIndex + 1);
        context.rect(xStartEvent, yStartEvent, xLength, G_EVENT_HEIGHT);
        context.fillStyle = this.functionToColor[event.functionName];
        context.fill();
        context.closePath();
    }
}

Layer.prototype.logEventToGrid = function (event) {
    for (var i = event.startIndex; i < event.endIndex + 1; i++) {
        this.gridToEvent[i][event.depth - 1] = event;
    }
}

Layer.prototype.createMouseListener = function () {
    var height = this.height,
        patternLength = this.patternLength, 
        maxStackDepth = this.maxStackDepth,
        gridToEvent = this.gridToEvent,
        hoverInfoBar = this.hoverInfoBar,
        functionToColor = this.functionToColor;
    
    var pointedEvent = function (canvas, e) {
        var canvasX = e.pageX - canvas.offsetLeft,
            canvasY = e.pageY - canvas.offsetTop,
            canvasHeight = height - canvasY,
            x = Math.floor((canvasX - G_LEFT_PADDING)/G_EVENT_LENGTH),
            y = Math.floor((canvasHeight - G_LOWER_PADDING)/G_EVENT_HEIGHT);

        if (x < 0 || patternLength < x || y < 0 || maxStackDepth <= y) {
            return null;
        } else {
            return gridToEvent[x][y];
        }
    }

    $(this.canvas).on("mousemove", function (e) {
        var event = pointedEvent(this, e);

        if (event) {
            var color = functionToColor[event.functionName];
            $("#hoverMessage").html(event.functionName);
            $(hoverInfoBar).css({
                "top": e.pageY, 
                "left": e.pageX,
                "cursor": "crosshair",
                "border-color": color
            });

            $(hoverInfoBar).show();  
        } else {
            $(hoverInfoBar).hide();
        }
    });
}

var Renderer = function (rootDiv, functions) {
    $(rootDiv).width(G_LAYER_WIDTH);

    this.patternDiv = document.createElement("div");
    $(rootDiv).append(this.patternDiv);
    $(this.patternDiv).width("100%");
    $(this.patternDiv).addClass("renderer");

    this.singlePatternDiv = document.createElement("div");
    $(this.patternDiv).append(this.singlePatternDiv);
    $(this.singlePatternDiv).width("100%");
    $(this.singlePatternDiv).addClass("singlePatternDiv");

    this.multiPatternsDiv = document.createElement("div");
    $(this.patternDiv).append(this.multiPatternsDiv);
    $(this.multiPatternsDiv).width("100%");
    $(this.multiPatternsDiv).addClass("multiPatternsDiv");    

    this.countBar = document.createElement("div");
    $(this.multiPatternsDiv).append(this.countBar);
    $(this.countBar).width(G_COUNT_BAR_WIDTH);
    $(this.countBar).css("float", "left");
    $(this.countBar).addClass("countBar");
    
    this.patternBar = document.createElement("div");
    $(this.multiPatternsDiv).append(this.patternBar);
    $(this.patternBar).width(G_MULTIPATTERN_WIDTH);
    $(this.patternBar).css("float", "left");
    $(this.patternBar).addClass("patternBar");

    this.hoverInfoBar = document.createElement("div");
    $(this.patternDiv).append(this.hoverInfoBar);
    $(this.hoverInfoBar).addClass("hoverInfoBar");

    var hoverMessage = document.createElement("p");
    $(this.hoverInfoBar).append(hoverMessage);
    $(hoverMessage).attr("id", "hoverMessage");
    $(hoverMessage).css({
        "position": "relative",
        "float": "left",
        "top": "50%",
        "left": "50%",
        "transform": "translate(-50%, -50%)",
        "font-size": "20px",
    });

    this.patternLayers = [];

    this.functions = Array.from(functions);
    this.functionToColor = {};
    this.selectColors();
}

Renderer.prototype.renderSinglePattern = function (pattern) {
    var patternLayer = new Layer(this.singlePatternDiv, this.hoverInfoBar);
    this.patternLayers.push(patternLayer);
    patternLayer.drawPattern(pattern.maxStackDepth, pattern.patternLength, pattern.processedEvents, this.functionToColor);
}

Renderer.prototype.renderMultiPattern = function (pattern) {
    var patternLayer = new Layer(this.patternBar, this.hoverInfoBar);
    this.patternLayers.push(patternLayer);
    patternLayer.drawPattern(pattern.maxStackDepth, pattern.patternLength, pattern.processedEvents, this.functionToColor);

    var countDiv = document.createElement("div");
    $(this.countBar).append(countDiv);
    $(countDiv).height(patternLayer.height + 2.5);

    var count = document.createElement("p");
    $(countDiv).append(count);
    $(count).html(pattern.count.toString());
    $(count).css({
        "position": "relative",
        "float": "left",
        "top": "50%",
        "left": "50%",
        "transform": "translate(-50%, -50%)",
        "font-size": "30px"
    });
}

Renderer.prototype.selectColors = function () {
    var colors = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", 
                  "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99",
                  "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262",
                  "#5574a6", "#3b3eac"];
    var functions = this.functions,
        i;

    for (i = 0; i < functions.length; i++) {
        this.functionToColor[functions[i]] = colors[i];
    }    
}

Renderer.prototype.createMouseListener = function () {
    for (var i = 0; i < this.patternLayers.length; i++) {
        this.patternLayers[i].createMouseListener();
    }
}