const http = require("http");
const { handleAuthRequest, refreshTokenRequest } = require("./requestManager");

http.createServer(function (request, response) {
    console.log(`Recieved query : ${request.url}`);

    if(request.url.startsWith("/api/auth/")) {
        handleAuthRequest(request, response);
    }

    if(request.url === "/api/auth/refresh" && request.method === "POST") {
        refreshTokenRequest(request, response);
    }
}).listen(8192);