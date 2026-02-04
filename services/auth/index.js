const http = require("http");
const { handleAuthRequest } = require("./requestManager");

http.createServer(function (request, response) {
    console.log(`Recieved query : ${request.url}`);

    if(request.url.startsWith("/api/auth/")) {
        handleAuthRequest(request, response);
    }
}).listen(8192);