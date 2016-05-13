function hideAll(panels){
    for (var i = 0; i < panels.length; i++) {
        panels[i].style.display = "none";
    }
}

function resizeWidgetCanvas(canvas){
    canvas.height = canvas.width;
}

var widgetStyles = {
    "GoogleTasks": {
        color: "#FBBC05"
    },
    "Gmail": {
        color: "#EA4335"
    },
    "Twitter": {
        color: "#00aced"
    }
}

var canvasGridSize = {
    x: 8,
    y: 8
}

function addV2(lhs, rhs) {
    return {x: lhs.x + rhs.x, y: lhs.y + rhs.y};
}

function subV2(lhs, rhs) {
    return {x: lhs.x - rhs.x, y: lhs.y - rhs.y};
}

function WidgetPanel(canvas, widgets){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.widgets = widgets;
    this.isDragging = false;
    this.draggedWidget = null;
    this.dragStart = null;
}

function getCellSize(panel){
    var canvas = panel.canvas;
    console.log("canvas size: " + canvas.width + " " + canvas.height);
    return {
	x: canvas.width/canvasGridSize.x,
	y: canvas.height/canvasGridSize.y
    }
}

function getVisibleCellSize(panel){
    var canvas = panel.canvas;
    return {
	x: canvas.offsetWidth/canvasGridSize.x,
	y: canvas.offsetHeight/canvasGridSize.y
    }
}

function getWidgetRect(widget, cellSize){
    var x = widget["WidgetPosition"]["X"];
    var y = widget["WidgetPosition"]["Y"];
    var h = widget["WidgetSize"]["X"];
    var w = widget["WidgetSize"]["Y"];

    return {
	x: x*cellSize.x,
	y: y*cellSize.y,
	w: w*cellSize.x,
	h: h*cellSize.y
    };
}

function getMouseGridPos(panel, point){
    var cellSize = getVisibleCellSize(panel);
    return {
	x: Math.floor(point.x/cellSize.x),
	y: Math.floor(point.y/cellSize.y)
    };
}

function getWidgetOnPoint(panel, point){
    var gridPos = getMouseGridPos(panel, point);
    console.log("Grid pos: " + gridPos.x + " " + gridPos.y);
    for (var i = 0; i < panel.widgets.length; i++){
	var widget = panel.widgets[i];
	if (widget.WidgetPosition.X <= gridPos.x &&
	    widget.WidgetPosition.X + widget.WidgetSize.X > (gridPos.x) &&
	    widget.WidgetPosition.Y <= gridPos.y &&
	    widget.WidgetPosition.Y + widget.WidgetSize.Y > (gridPos.y)){
	    return widget;
	}
    }
    return null;
}

function createConfirmCallback(widgetName, xInput, yInput, wInput, hInput) {
    return function() {
	var x = xInput.value;
	var y = yInput.value;
	var w = wInput.value;
	var h = hInput.value;

	var request = new XMLHttpRequest();
	request.open('POST', '/widgets');
	var content = {
	    "widget": widgetName,
	    "token": localStorage.getItem("token"),
	    "x": x,
	    "y": y,
	    "width": w,
	    "height": h
	};
	request.setRequestHeader('Content-Type', 'application/json');
	request.send(JSON.stringify(content));
    }
}

function onWidgetPanelMouseDown(event, panel){
    var mousePos = {x: event.offsetX, y: event.offsetY};
    var widget = getWidgetOnPoint(panel, mousePos);
    if (widget){
	panel.isDragging = true;
	panel.draggedWidget = widget;
	panel.dragStart = mousePos;
	console.log("Dragging " + widget.WidgetName);
    }
}

function onWidgetPanelMouseUp(event, panel){
    if (panel.isDragging){
	var mousePos = {x: event.offsetX, y: event.offsetY};

	// we don't drop widgets on top of each other
	if (!getWidgetOnPoint(panel, mousePos)){
	    var cellSize = getVisibleCellSize(panel);
	    var delta = subV2(mousePos, panel.dragStart);
	    var gridDelta = {x: delta.x / cellSize.x, y: delta.y / cellSize.y};
	    var widget = panel.draggedWidget;
	    widget.WidgetPosition.X = Math.round(widget.WidgetPosition.X + gridDelta.x);
	    widget.WidgetPosition.Y = Math.round(widget.WidgetPosition.Y + gridDelta.y);
	    drawWidgetPanel(panel);

	    var request = new XMLHttpRequest();
	    request.open('POST', '/widgets');
	    var content = {
		"widget": widget.WidgetName,
		"token": localStorage.getItem("token"),
		"x": widget.WidgetPosition.X,
		"y": widget.WidgetPosition.Y,
		"width": widget.WidgetSize.X,
		"height": widget.WidgetSize.Y
	    };
	    request.setRequestHeader('Content-Type', 'application/json');
	    request.send(JSON.stringify(content));

	}
	panel.isDragging = false;
    }
}

function onWidgetPanelMouseMove(event, panel){
    if (panel.isDragging){
	console.log("Move");
    }
}

function drawWidgetPanel(panel){
    var ctx = panel.ctx;
    resizeWidgetCanvas(panel.canvas);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, panel.canvas.width, panel.canvas.height);
    var cellSize = getCellSize(panel);
    ctx.beginPath();
    for (var i = 0; i < canvasGridSize.x+1; i++){
	var xCoord = i*cellSize.x
	ctx.moveTo(xCoord, 0);
	ctx.lineTo(xCoord, panel.canvas.width);
    }
    for (var i = 0; i < canvasGridSize.y+1; i++){
	var yCoord = i*cellSize.x
	ctx.moveTo(0, yCoord);
	ctx.lineTo(panel.canvas.height, yCoord);
    }
    ctx.strokeStyle = 'black';
    ctx.stroke();
    
    for (var i = 0; i < panel.widgets.length; i++){
        var widget = panel.widgets[i]
	var widgetName = widget["WidgetName"];
	var widgetStyle = widgetStyles[widgetName];
        ctx.fillStyle = widgetStyle.color;
	var widgetRect = getWidgetRect(widget, cellSize);
	ctx.fillRect(widgetRect.x, widgetRect.y, widgetRect.w, widgetRect.h);
    }
}

function initWidgetPanel(widgetSizesRequest){
    if (widgetSizesRequest.readyState != XMLHttpRequest.DONE ||
        widgetSizesRequest.status != 200){
        return;
    }

    var widgets = JSON.parse(widgetSizesRequest.response)["Widgets"];
    console.log("Widget sizes");
    console.log(widgets);
    var widgetsMap = {};
    for (var i = 0; i < widgets.length; i++){
        var elem = widgets[i];
        widgetsMap[elem["WidgetName"]] = elem;
    }

    var widgetCanvas = document.getElementById("WidgetCanvas");
    var panel = new WidgetPanel(widgetCanvas, widgets);
    widgetCanvas.addEventListener("mousedown", function(event){onWidgetPanelMouseDown(event, panel);}, false);
    widgetCanvas.addEventListener("mouseup", function(event){onWidgetPanelMouseUp(event, panel);}, false);
    widgetCanvas.addEventListener("mousemove", function(event){onWidgetPanelMouseMove(event, panel);}, false);
    drawWidgetPanel(panel);

    var widgetNames = ["GoogleTasks", "Gmail", "Twitter"];
    for (var i = 0; i < widgetNames.length; i++){
        var widgetName = widgetNames[i];
	console.log("setting callback for " + widgetName);
        var xInput = document.getElementById(widgetName + "X");
        var yInput = document.getElementById(widgetName + "Y");
        var wInput = document.getElementById(widgetName + "W");
        var hInput = document.getElementById(widgetName + "H");

        if (widgetName in widgetsMap){
            var widget = widgetsMap[widgetName];
            xInput.value = widget["WidgetPosition"]["X"];
            yInput.value = widget["WidgetPosition"]["Y"];
            wInput.value = widget["WidgetSize"]["X"];
            hInput.value = widget["WidgetSize"]["Y"];
        }

        var confirmButton = document.getElementById(widgetName + "ConfirmButton");
        confirmButton.onclick = createConfirmCallback(widgetName, xInput, yInput, wInput, hInput);}
}

window.onload = function() {
    var googleTaskPanel = document.getElementById("GoogleTasksPanel");
    var gmailPanel = document.getElementById("GmailPanel");
    var twitterPanel = document.getElementById("TwitterPanel");
    var widgetPanel = document.getElementById("WidgetsPanel");

    var panels = [googleTaskPanel, gmailPanel, twitterPanel, widgetPanel];

    var googleTaskButton = document.getElementById("GoogleTasksNavButton");
    googleTaskButton.onclick = function() {
        hideAll(panels);
        googleTaskPanel.style.display = "block";
    };
    document.getElementById("GmailNavButton").onclick = function() {
        hideAll(panels);
        gmailPanel.style.display = "block";
    }
    document.getElementById("TwitterNavButton").onclick = function() {
        hideAll(panels);
        twitterPanel.style.display = "block";
    }
    document.getElementById("WidgetsNavButton").onclick = function() {
        hideAll(panels);
        widgetPanel.style.display = "block";
    }
    hideAll(panels);
    googleTaskPanel.style.display = "block";


    var widgetSizesRequest = new XMLHttpRequest();
    widgetSizesRequest.open('GET', '/widgets');
    widgetSizesRequest.setRequestHeader('Content-Type', 'application/json');
    widgetSizesRequest.onreadystatechange = function(){
        initWidgetPanel(widgetSizesRequest);
    }
    widgetSizesRequest.send();
}
