const http = require("http");
const { handleAuthRequest, refreshTokenRequest } = require("./requestManager");

http.createServer(function (request, response) {
    console.log(`Recieved query : ${request.url}`);

    if(request.method === "OPTIONS") {
        response["Access-Control-Allow-Origin"] = "*";
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, PATCH, DELETE";
        response["Access-Control-Allow-Headers"] = "X-Requested-With,content-type";
        response["Access-Control-Allow-Credentials"] = true;
        response.statusCode = 204;
        response.end();
        return;
    }

    if(request.url === "/api/auth/refresh" && request.method === "POST") {
        refreshTokenRequest(request, response);
    }

    if(request.url.startsWith("/api/auth/")) {
        handleAuthRequest(request, response);
    }

    
}).listen(8192);