/**
 * @description Pattern canvas view.
 * @author Wouter Hisschemöller
 * @version 0.0.0
 * 
 * @namespace WH.epg
 */
 
window.WH = window.WH || {};
window.WH.epg = window.WH.epg || {};

(function (ns) {
    
    function createPatternCanvas(specs) {
        
        var that = specs.that,
            patterns = specs.patterns,
            canvasA = document.getElementById('canvas__animation'),
            $canvasA = $(canvasA),
            canvasB = document.getElementById('canvas__background'),
            ctxA = canvasA.getContext('2d'),
            ctxB = canvasB.getContext('2d'),
            rect = canvasA.getBoundingClientRect(),
            stepSize = 4,
            doubleClickCounter = 0,
            doubleClickDelay = 300,
            doubleClickTimer,
            isTouchDevice = 'ontouchstart' in document.documentElement,
        
            /**
             * Type of events to use, touch or mouse
             * @type {String}
             */
            eventType = {
                start: isTouchDevice ? 'touchstart' : 'mousedown',
                end: isTouchDevice ? 'touchend' : 'mouseup',
                click: isTouchDevice ? 'touchend' : 'click',
                move: isTouchDevice ? 'touchmove' : 'mousemove',
            },
            
            init = function() {
                $canvasA.on(eventType.click, onClick);
                $canvasA.on(eventType.start, onTouchStart);
                // prevent system doubleclick to interfere with the custom doubleclick
                $canvasA.on('dblclick', function(e) {e.preventDefault();});
            },
            
            /**
             * Separate click and doubleclick.
             * @see http://stackoverflow.com/questions/6330431/jquery-bind-double-click-and-single-click-separately
             */
            onClick = function(e) {
                // separate click from doubleclick
                doubleClickCounter ++;
                if (doubleClickCounter == 1) {
                    doubleClickTimer = setTimeout(function() {
                        // single click
                        doubleClickCounter = 0;
                        // not used yet
                    }, doubleClickDelay);
                } else {
                    // doubleclick
                    clearTimeout(doubleClickTimer);
                    doubleClickCounter = 0;
                    // create new pattern
                    patterns.createPattern({
                        canvasX: e.clientX - rect.left,
                        canvasY: e.clientY - rect.top
                    });
                }
            },
            
            /**
             * Start dragging a pattern.
             */
            onTouchStart = function(e) {
                // Prevent text cursor during drag, http://stackoverflow.com/a/9743380
                e.originalEvent.preventDefault();
                var x = e.clientX - rect.left, 
                    y = e.clientY - rect.top,
                    ptrn = patterns.getPatternByCoordinate(x, y);
                if (ptrn) {
                    // set the pattern as selected
                    patterns.selectPattern(ptrn);
                    // prepare to drag the pattern
                    var eventData = {
                        ptrn: ptrn,
                        offsetX: x - ptrn.canvasX,
                        offsetY: y - ptrn.canvasY
                    };
                    $canvasA.on(eventType.move, eventData, onTouchMove);
                    $canvasA.on(eventType.end, eventData, onTouchEnd);
                }
            },
            
            /**
             * Drag a pattern.
             */
            onTouchMove = function(e) {
                e.data.ptrn.canvasX = e.clientX - rect.left - e.data.offsetX;
                e.data.ptrn.canvasY = e.clientY - rect.top - e.data.offsetY;
                patterns.refreshCanvas();
            },
            
            /**
             * End dragging a pattern.
             */
            onTouchEnd = function(e) {
                e.data.ptrn.canvasX = e.clientX - rect.left - e.data.offsetX;
                e.data.ptrn.canvasY = e.clientY - rect.top - e.data.offsetY;
                patterns.refreshCanvas();
                $canvasA.off(eventType.move, onTouchMove);
                $canvasA.off(eventType.end, onTouchEnd);
            },
           
            /**
             * Update while transport runs.
             * Passed on by patterns which adds pattern data.
             * @param {Array} patternData Data of all patterns.
             */
            drawA = function(patternData) {
                var i, 
                    numPatterns = patternData.length,
                    x, y,
                    data;
                    
                ctxA.clearRect(0, 0, 300, 200);
                
                for (i = 0; i < numPatterns; i++) {
                    ptrn = patternData[i];
                    x = ptrn.canvasX + ((ptrn.position / ptrn.duration) * ((ptrn.steps - 1) * stepSize));
                    y = ptrn.canvasY;
                    ctxA.save();
                    ctxA.translate(x, y);
                    ctxA.fillStyle = ptrn.isOn ? '#666' : '#999';
                    var h = ptrn.isOn ? stepSize * 1.5 : stepSize;
                    ctxA.fillRect(0, 0, stepSize, h);
                    ctxA.restore();
                }
            },
            
            drawB = function(patternData) {
                var i, j, 
                    numPatterns = patternData.length,
                    numSteps,
                    x, y,
                    ptrn;
                    
                ctxB.clearRect(0, 0, 300, 200);
                
                for (i = 0; i < numPatterns; i++) {
                    ptrn = patternData[i];
                    ptrn.canvasWidth = ptrn.steps * stepSize;
                    ptrn.canvasHeight = stepSize * 2;
                    
                    y = ptrn.canvasY;
                    numSteps = ptrn.steps;
                    for (j = 0; j < numSteps; j++) {
                        x = ptrn.canvasX + (j * stepSize);
                        ctxB.save();
                        ctxB.translate(x, y);
                        ctxB.fillStyle = (ptrn.euclidPattern[j]) ? '#ccc' : '#eee';
                        ctxB.fillRect(0, 0, stepSize, stepSize);
                        ctxB.restore();
                    }
                    
                    if (ptrn.isSelected) {
                        ctxB.save();
                        ctxB.translate(ptrn.canvasX, ptrn.canvasY + stepSize + 2);
                        ctxB.fillStyle = '#ccc';
                        ctxB.fillRect(0, 0, stepSize * ptrn.steps, 1);
                        ctxB.restore();
                    }
                    
                    if (ptrn.name && ptrn.name.length > 0) {
                        x = ptrn.canvasX + (stepSize * (numSteps / 2));
                        y = ptrn.canvasY + (stepSize * 2)
                        ctxB.save();
                        ctxB.translate(x, y);
                        ctxB.font = '10px sans-serif';
                        ctxB.textAlign = 'center';
                        ctxB.textBaseline = 'top';
                        ctxB.fillStyle = '#ccc';
                        ctxB.fillText(ptrn.name, 0, 0);
                        ctxB.restore();
                    }
                }
            };
           
       that = specs.that;
       
       init();
       
       that.drawA = drawA;
       that.drawB = drawB;
       return that;
   }

   ns.createPatternCanvas = createPatternCanvas;

})(WH.epg);