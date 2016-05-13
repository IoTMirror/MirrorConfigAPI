function hideAll(panels){
    for (var i = 0; i < panels.length; i++) {
        panels[i].style.display = "none";
    }
}

function resizeWidgetCanvas(canvas){
    canvas.height = canvas.width;
}

var widgetsStyles = {
    GoogleTasks: {
        color = "#FBBC05"
    },
    Gmail: {
        color = "EA4335"
    },
    Twitter: {
        color = "#00aced"
    }
}
function initWidgetPanel(widgetSizesRequest){
    if (widgetSizesRequest.readyState != XMLHttpRequest.DONE ||
        widgetSizesRequest.status != 200){
        return;
    }

    var widgetSizes = JSON.parse(widgetSizesRequest.response)["Widgets"];
    var widgetsMap = {};
    for (var i = 0; i < widgetSizes.length; i++){
        var elem = widgetSizes[i];
        widgetsMap[elem["WidgetName"]] = elem;
    }


    var widgetCanvas = document.getElementById("WidgetCanvas");
    widgetCanvas.widgetsMap = widgetsMap;
    var ctx = canvas.getContext("2d");
    resizeWidgetCanvas(widgetCanvas);
    for (var i = 0; i < widgetsSizes.length; i++){
        var widget = widgetsSizes[i]
        ctx.fillStyle = widgetsStyles[widget["WidgetName"]].color;
        var x = widget["WidgetPosition"]["X"];
        var y = widget["WidgetPosition"]["Y"];
        var h = widget["WidgetSize"]["X"];
        var w = widget["WidgetSize"]["Y"];
        ctx.fillRect()
    }

    var widgetNames = ["GoogleTasks", "Gmail", "Twitter"];
    for (var i = 0; i < widgetNames.length; i++){
        var widgetName = widgetNames[i];
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
            console.log(widget);
            console.log(xInput.value);
        }

        var confirmButton = document.getElementById(widgetName + "ConfirmButton");
        confirmButton.onclick = function() {
            var x = xInput.value;
            var y = yInput.value;
            var w = wInput.value;
            var h = hInput.value;

            var request = new XMLHttpRequest();
            request.open('POST', '/widgets');
            var content = {
                "token": localStorage.getValue("token"),
                "x": x,
                "y": y,
                "w": w,
                "h": h
            };
            request.setRequestHeader('Content-Type', 'application/json');
            request.send(JSON.stringify(content));
        }
    }
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
    console.log("BBBB");
}