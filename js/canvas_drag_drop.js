/**
 * Base class for shapes
 */
function Shape(x, y){
    this.x = x;
    this.y = y;
    this.ctx = null; // CanvasRenderingContext2D object to render the shape on canvas   
    
    return this;
}
Shape.prototype.setContext = function(ctx){
    if(ctx instanceof CanvasRenderingContext2D){
        this.ctx = ctx;
    }else{
        console.log("Invalid context object");
    }
};
/* gets the size of shape, returns array like [width, height] */
Shape.prototype.getSize = function(){
    return [0, 0];
};
Shape.prototype.paint = function(){ /* empty */ };
Shape.prototype.drawSelection = function(color, lineWidth){ /* empty */ };

Shape.prototype.clone = function(){    
    var copy = Object.create(Object.getPrototypeOf(this));    
    for(var key in this){
        if(this.hasOwnProperty(key)){
            copy[key] = this[key];
        }
    }
    
    return copy;
};
Shape.prototype.setPosition = function(x, y){
    this.x = x;
    this.y = y;
};

/**
 * Rectangle class, inherits from Shape
 *
 * @param x -- the x coordinate of Rectangle's left upper corner
 * @param y -- the y coordinate of Rectangle's left upper corner
 * @param w -- width of Rectangle
 * @param h -- height of Rectangle
 * @param fill -- fill style of Rectangle
 *
 */
function Rectangle(x, y, w, h, fill){
    /* invoke the constructor of Shape to initialize the base properties and methods */
    Shape.call(this, x, y);
    this.w = w;
    this.h = h;
    this.fill = fill;
    
    return this;
}
Rectangle.prototype = new Shape();
/* override getSize and paint methods for Rectangle */
Rectangle.prototype.getSize = function(){
    return [this.w, this.h];
};
Rectangle.prototype.paint = function(){
    if(this.ctx != null){
        this.ctx.save();
        this.ctx.fillStyle = this.fill;
        this.ctx.fillRect(this.x, this.y, this.w, this.h);        
        this.ctx.restore();
    }
};
Rectangle.prototype.drawSelection = function(color, lineWidth){
    if(this.ctx != null){
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(this.x, this.y, this.w, this.h);
        this.ctx.restore();
    }
};

/**
 * Circle class, inherits from Shape
 *
 * @param x -- x of circumscribed square's left upper corner
 * @param y -- y of circumscribed square's left upper corner
 * @param r -- radius of Circle
 * @param fill -- fill style of Circle
 *
 */
function Circle(x, y, r, fill){
    /* invoke the constructor of Shape to initialize the base properties and methods */
    Shape.call(this, x, y);
    this.r = r;
    this.fill = fill;
    
    return this;
}
Circle.prototype = new Shape();
/* override getSize and paint methods for Circle */
Circle.prototype.getSize = function(){
    return [this.r * 2, this.r * 2];
};
Circle.prototype.paint = function(){
    if(this.ctx != null){
        
        /* calculate the center point coordinate of the Circle */
        var centerX = this.x + this.r;
        var centerY = this.y + this.r;
        
        this.ctx.save();
        this.ctx.fillStyle = this.fill;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.r, 0, 2*Math.PI, true);
        this.ctx.fill();        
        this.ctx.restore();
    }
};
Circle.prototype.drawSelection = function(color, lineWidth){
    if(this.ctx != null){
        /* calculate the center point coordinate of the Circle */
        var centerX = this.x + this.r;
        var centerY = this.y + this.r;
        
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, this.r, 0, 2*Math.PI, true);        
        this.ctx.stroke();
        this.ctx.restore();
    }
};


/**
 * immediate function for canvas animation
 */
var DragDrop = (function(){
    
    var INTERVAL = 10; // frequency to refresh the canvas, 10ms
    var OBJECT_KEY = "Object";
    var SELECTION_COLOR = "blue"; // default selection color
    var SELECTION_LINE_WIDTH = 3; // default selection line width
    
    /** private variables -- start **/
    var canvas = null,                  // canvas element
        context = null,                 // context of canvas element
        canvasWidth = 0,                // width of canvas element
        canvasHeight = 0,               // height of canvas element
        allObjects = [],                // objects need to be displayed in canvas
        refreshEnabled = false,         // flag variable to control whether we refresh the canvas
        dragOffset = {                  // the offsets from the mouse's (x, y) to object's (x, y) 
            x:0,
            y:0
        },
        mousePos = {                    // mouse position relative to the upper left corner of canvas
            x:0,
            y:0
        },        
        ghostcanvas = null,             // ghost canvas
        gctx = null,                    // context object of ghost canvas        
        selObj = null,                  // current selected object
        isDrag = false,                 // whether the mouse is dragging an object
        originalPos = {                 // the original position of selected object before dragging
    		x:0,
    		y:0
    	};
    /** private variables -- end **/
    
    /** private methods -- start **/
    // erase everything on the canvas
    function clearCanvas(ctx){
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }
    // draw everything held in array "allObjects", invoked in setInterval() while initialize the canvas
    function drawAllObjects(){
        if(refreshEnabled == true){
            // actually draw objects only when refresh is enabled
            
            clearCanvas(context); // clear the canvas firstly
            
            // loop the array "allObjects" and call the paint method of each item
            for(i in allObjects){
                var obj = allObjects[i];
                if(context != null && obj instanceof Shape){
                    drawObject(context, obj);
                }
            }
            
            if(selObj != null){
               selObj.drawSelection(SELECTION_COLOR, SELECTION_LINE_WIDTH);
            }
            
            refreshEnabled = false;
        }
    }
    // set context to a single object and draw this object 
    function drawObject(ctx, obj){        
        obj.setContext(ctx);
        obj.paint();
    }
    
    function enableRefresh(){
        refreshEnabled = true;
    }
    
    // add an object to allObjects array
    function addObject(obj){
        if(obj instanceof Shape){
            allObjects.push(obj);
            enableRefresh();
        }
    }
    
    function initCanvasEvents(){
        // make the canvas droppable
        $(canvas).droppable({ drop: dropIntoCanvas });
        
        /* bind mouse events to the canvas to enable drag & drop in canvas */
        canvas.onmousedown = mouseDownForDrag;
        canvas.onmousemove = mouseMoveForDrag;
        canvas.onmouseup = mouseUpForDrag;
        canvas.onmouseleave = mouseleaveForDrag;
    }
    
    // get the mouse position relative to left upper corner of canvas
    function getMouse(e){
        if(canvas != null){
            mousePos.x = e.pageX - $(canvas).offset().left - parseInt($(canvas).css("border-left-width"));
            mousePos.y = e.pageY - $(canvas).offset().top - parseInt($(canvas).css("border-top-width"));
        }
    }
    
    function setDragOffset(offsetX, offsetY){
        dragOffset.x = offsetX;
        dragOffset.y = offsetY;
    }
    
    function checkSelected(obj){
        var isSelected = false;
        
        clearCanvas(gctx); // clear ghost canvas
        drawObject(gctx, obj); // draw object onto ghost canvas
        
        var imageData=gctx.getImageData(mousePos.x, mousePos.y, 1, 1);        
        if(imageData.data[3] > 0){
            /* if the alpha value of the pixel where the mouse clicked is not 0,
             * this pixel is inside the object, then the object is selected
             */
            isSelected = true;
        }
        
        return isSelected;
    }
    
    function dropIntoCanvas(e, ui){
        getMouse(e);
        
        // get the bundle object of the image being dragged
        var bundleObj = $(ui.helper.context).data(OBJECT_KEY);
        var copy = bundleObj.clone();
        
        // set object position
        copy.setPosition(mousePos.x - dragOffset.x, mousePos.y - dragOffset.y);
        // add object to array allObjects
        addObject(copy);
    }
    
    function mouseDownForDrag(e){
        getMouse(e);
        
        var l = allObjects.length;
        for(var i = l-1; i >=0; i--){
            var tmpObj = allObjects[i];
            if(checkSelected(tmpObj)){
                isDrag = true;
                selObj = tmpObj;                
                /* record the offset of mouse position relative to object position */
                setDragOffset(mousePos.x - selObj.x, mousePos.y - selObj.y);
                /* save the original position of selected object */
                originalPos.x = mousePos.x - dragOffset.x;
                originalPos.y = mousePos.y - dragOffset.y;
                /* move the selected object to the last of array, 
                 * so that it looks selected object is on the top of rest ones 
                 */
                allObjects.splice(i, 1);
                allObjects.push(selObj);
                break;
            }else{
                selObj = null;
                isDrag = false;
            }
        }
                
        enableRefresh();
    }
    
    function mouseMoveForDrag(e){
        getMouse(e);
        
        if(isDrag){
            selObj.setPosition(mousePos.x - dragOffset.x, mousePos.y - dragOffset.y);
            enableRefresh();
        }
    }
    
    function mouseUpForDrag(e){
        isDrag = false;
        selObj = null;
    }
    
    function mouseleaveForDrag(e){
    	if(selObj != null) {
    		selObj.setPosition(originalPos.x, originalPos.y);
            enableRefresh();
    	}
        
    	mouseUpForDrag(e);
    }
    /** private methods -- end **/
    
    /** public methods -- start **/
    return {
        initCanvas: function(elemID){
            canvas = document.getElementById(elemID);
            if(canvas !== null && canvas.getContext){
                context = canvas.getContext("2d");
                canvasWidth = canvas.width;
                canvasHeight = canvas.height;
                
                /* initialize ghost canvas */
                ghostcanvas = document.createElement("canvas");
                ghostcanvas.width = canvasWidth;
                ghostcanvas.height = canvasHeight;
                gctx = ghostcanvas.getContext("2d");
                
                /* bind mouse events to the canvas */
                initCanvasEvents();                
                
                /* set up the refresh loop */
                setInterval(drawAllObjects, INTERVAL);
            }
        },        
        generateDraggableImage: function(obj){
            if(obj instanceof Shape){
                
                var size = obj.getSize(); // get width and height of object
            
                /* create canvas with same size of Shape object */
                var objCanvas = document.createElement("canvas");
                objCanvas.width = size[0];
                objCanvas.height = size[1];
                
                /* draw the Shape object onto the canvas */
                obj.setContext(objCanvas.getContext("2d"));
                obj.paint();
                
                /* converto canvas into HTML img and bind the Shape object to the generated img */
                var bankItem = jQuery("<img width=" + size[0] + " height=" + size[1] + ">");
                bankItem.attr("src", objCanvas.toDataURL("image/png")).data(OBJECT_KEY, obj);
                
                /* make the img draggable with jQuery */
                bankItem.draggable({
                    helper : "clone",
                    start : function(e, ui){
                        var offsetX = e.pageX - $(e.target).offset().left;
                        var offsetY = e.pageY - $(e.target).offset().top;
                        setDragOffset(offsetX, offsetY);
                    }
                });
                
                return bankItem;
            }
        }
    };
    /** public methods -- end **/
})();