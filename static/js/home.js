
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
    for (var i=0; i< widgets.length; i++){
	var widget = widgets[i];
	if(widget.WidgetName == "Twitter"){
	    this.twitterWidget = widget;
	} else if (widget.WidgetName == "Gmail"){
	    this.gmailWidget = widget;
	} else if (widget.WidgetName == "GoogleTasks") {
	    this.tasksWidget = widget;
	}
    }
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
    var w = widget["WidgetSize"]["X"];
    var h = widget["WidgetSize"]["Y"];

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

function getWidgetOnPoint(panel, gridPos){
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

function sendWidgetUpdate(widget){
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

function onWidgetPanelMouseDown(event, panel){
    var mousePos = {x: event.offsetX, y: event.offsetY};
    var gridPos = getMouseGridPos(panel, mousePos);
    var widget = getWidgetOnPoint(panel, gridPos);
    if (widget){
	panel.isDragging = true;
	panel.draggedWidget = widget;
	panel.dragStart = gridPos;
	console.log("Dragging " + widget.WidgetName);
    }
}

function onWidgetPanelMouseUp(event, panel){
    if (panel.isDragging){
	var mousePos = {x: event.offsetX, y: event.offsetY};
	var gridPos = getMouseGridPos(panel, mousePos);

	// we don't drop widgets on top of each other
	var widgetUnderMouse = getWidgetOnPoint(panel, gridPos);
	if (!widgetUnderMouse || !widgetUnderMouse.enabled){
	    var cellSize = getVisibleCellSize(panel);
	    var gridDelta = subV2(gridPos, panel.dragStart);
	    var widget = panel.draggedWidget;
	    var newX = Math.round(widget.WidgetPosition.X + gridDelta.x);
	    var newY = Math.round(widget.WidgetPosition.Y + gridDelta.y);
	    if (newX >= 0 &&
		newX + widget.WidgetSize.X <= canvasGridSize.x &&
		newY >= 0 &&
	        newY + widget.WidgetSize.Y <= canvasGridSize.y){
		widget.WidgetPosition.X = newX;
		widget.WidgetPosition.Y = newY;
		drawWidgetPanel(panel);
		sendWidgetUpdate(widget);
	    }
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
    var canvas = panel.canvas;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.width;
    var ctx = panel.ctx;
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
	if (!widget.enabled){
	    continue;
	}
	var widgetName = widget["WidgetName"];
	var widgetStyle = widgetStyles[widgetName];
        ctx.fillStyle = widgetStyle.color;
	var widgetRect = getWidgetRect(widget, cellSize);
	ctx.fillRect(widgetRect.x, widgetRect.y, widgetRect.w, widgetRect.h);
    }
}

function registerWidgetToInputs(panel, widget, wInput, hInput){
    wInput.value = widget.WidgetSize.X;
    hInput.value = widget.WidgetSize.Y;

    wInput.addEventListener("input", function(event){
	var val = Number(wInput.value);
	if (!isNaN(val) && val > 0 && val < 8)
	{
	    widget.WidgetSize.X = val;
	    drawWidgetPanel(panel);
	    sendWidgetUpdate(widget);
	}
    }, false);

    hInput.addEventListener("input", function(event){
	var val = Number(hInput.value);
	if (!isNaN(val) && val > 0 && val < 8)
	{
	    widget.WidgetSize.Y = val;
	    drawWidgetPanel(panel);
	    sendWidgetUpdate(widget);
	}
    }, false);
}

function switchControlPane(enabled, widgetName, widgetMap){
    if (enabled){
	document.getElementById(widgetName + "LoginButtonForm").style.display = "none";
    }
    else {
	document.getElementById(widgetName + "SizeForm").style.display = "none";
    }
    widgetMap[widgetName].enabled = enabled;
}

function bindRedirectButton(buttonName, url){
    document.getElementById(buttonName).onclick = function(event){
	event.preventDefault();
	window.location.replace(url)
    };
}

function initWidgetPanel(widgetSizesRequest){
    if (widgetSizesRequest.readyState != XMLHttpRequest.DONE ||
        widgetSizesRequest.status != 200){
        return;
    }

    var respJson = JSON.parse(widgetSizesRequest.response)
    console.log(respJson);
    var widgets = respJson["Widgets"];
    console.log("Widget sizes");
    console.log(widgets);

    var widgetCanvas = document.getElementById("WidgetCanvas");
    var panel = new WidgetPanel(widgetCanvas, widgets);
    widgetCanvas.addEventListener("mousedown", function(event){onWidgetPanelMouseDown(event, panel);}, false);
    widgetCanvas.addEventListener("mouseup", function(event){onWidgetPanelMouseUp(event, panel);}, false);
    widgetCanvas.addEventListener("mousemove", function(event){onWidgetPanelMouseMove(event, panel);}, false);

    var tasksW = document.getElementById("GoogleTasksW");
    var tasksH = document.getElementById("GoogleTasksH");
    var twitterW = document.getElementById("TwitterW");
    var twitterH = document.getElementById("TwitterH");
    var gmailW = document.getElementById("GmailW");
    var gmailH = document.getElementById("GmailH");

    var widgetsMap = {};
    for (var i = 0; i < widgets.length; i++){
        var elem = widgets[i];
        widgetsMap[elem["WidgetName"]] = elem;
    }
    registerWidgetToInputs(panel, widgetsMap["GoogleTasks"], tasksW, tasksH);
    registerWidgetToInputs(panel, widgetsMap["Twitter"], twitterW, twitterH);
    registerWidgetToInputs(panel, widgetsMap["Gmail"], gmailW, gmailH);
    
    switchControlPane(respJson["Twitter"].logged_in, "Twitter", widgetsMap);
    switchControlPane(respJson["Google"].logged_in, "Gmail", widgetsMap);
    switchControlPane(respJson["Google"].logged_in, "GoogleTasks", widgetsMap);

    bindRedirectButton("TwitterDeleteButton", "/twitter/signout/do");
    bindRedirectButton("GmailDeleteButton", "/google/signout/do");
    bindRedirectButton("GoogleTasksDeleteButton", "/google/signout/do");

    bindRedirectButton("TwitterLoginButton", "/twitter/signin/do");
    bindRedirectButton("GmailLoginButton", "/google/signin/do");
    bindRedirectButton("GoogleTasksLoginButton", "/google/signin/do");

    document.getElementById("WidgetsPanelContainer").style.display = "block";
    drawWidgetPanel(panel);
}

window.onload = function() {
    var widgetSizesRequest = new XMLHttpRequest();
    widgetSizesRequest.open('GET', '/widgets');
    widgetSizesRequest.setRequestHeader('Content-Type', 'application/json');
    widgetSizesRequest.onreadystatechange = function(){
        initWidgetPanel(widgetSizesRequest);
    }
    widgetSizesRequest.send();
}
