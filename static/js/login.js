function login(event){
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;

    var request = new XMLHttpRequest();
    request.onreadystatechange = function(){onLogin(request);};
    request.open('POST', '/login', true);
    request.setRequestHeader('Content-Type', 'application/json');
    request.send(JSON.stringify({"username": username, "password": password}));
}

function onLogin(request){
    if (request.readyState === XMLHttpRequest.DONE &&
        request.status === 200){
            var resp = JSON.parse(request.response);
            window.test = resp;
            localStorage.setItem("token", resp["Token"]);
            window.location.replace("/");
    }
}

window.onload = function() {
    document.getElementById("login_button").onclick = login;
}