const http = require("http");
const { handleAuthRequest, refreshTokenRequest, handleUserInfo, handleIsLoggedIn } = require("./requestManager");

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

    if(request.url.startsWith("/api/auth/is-logged-in") && request.method === "GET") {
        handleIsLoggedIn(request, response);
        return;
    }

    if (request.url.startsWith("/api/auth/")) {
        handleAuthRequest(request, response);
        return;
    }

    if (request.url.startsWith("/api/user/info") && request.method === "GET") {
        handleUserInfo(request, response);
        return;
    }

    console.log(`No route found for ${request.url}`);
    response.statusCode = 404;
    response.end("Not Found");


}).listen(8192);