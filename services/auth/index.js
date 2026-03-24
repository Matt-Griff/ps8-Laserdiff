const http = require("http");
const { handleAuthRequest, refreshTokenRequest, handleUserInfo, handleMyInfo, handleIsLoggedIn, handleUsersList, handleUserInfoGet } = require("./requestManager");

http.createServer(function (request, response) {
    console.log(`Recieved query : ${request.url}`);

    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    response.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    response.setHeader("Access-Control-Allow-Credentials", "true");

    if (request.method === "OPTIONS") {
        response.statusCode = 204;
        response.end();
        return;
    }

    if (request.url === "/api/auth/refresh" && request.method === "POST") {
        refreshTokenRequest(request, response);
        return;
    }

    if (request.url.startsWith("/api/auth/is-logged-in") && request.method === "GET") {
        handleIsLoggedIn(request, response);
        return;
    }

    if (request.url.startsWith("/api/user/me") && request.method === "GET") {
        console.log(`Handling auth request for ${request.url}`);
        handleMyInfo(request, response);
        return;
    }

    if (request.url.startsWith("/api/auth/")) {
        handleAuthRequest(request, response);
        return;
    }

    if (request.url.startsWith("/api/user/") && request.method === "POST") {
        handleUserInfo(request, response);
        return;
    }

    if (request.url.startsWith("/api/user/") && request.method === "GET") {
        handleUserInfoGet(request, response);
        return;
    }

    if (request.url.startsWith("/api/users") && request.method === "GET") {
        handleUsersList(request, response);
        return;
    }

    console.log(`No route found for ${request.url}`);
    response.statusCode = 404;
    response.end("Not Found");


}).listen(8192);