const http = require("http");
const { handleUpdateUserInfo, handleGetUserInfo } = require("./handler/user.js");
const USER_PORT = process.env.USER_PORT || 8006;

http.createServer(function (request, response) {
    console.log(`Recieved query : ${request.url} with method ${request.method}`);

    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    response.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    response.setHeader("Access-Control-Allow-Credentials", "true");

    if (request.method === "OPTIONS") {
        response.statusCode = 204;
        response.end();
        return;
    }

    if (request.url.startsWith("/api/user") && request.method === "POST") {
        handleUpdateUserInfo(request, response);
        return;
    }
    else if (request.url.startsWith("/api/user") && request.method === "GET") {
        handleGetUserInfo(request, response);
        return;
    }

    console.log(`User-Service : No route found for ${request.url}`);
    response.statusCode = 404;
    response.end("Not Found");


}).listen(USER_PORT, () => {
    console.log(`User service is running on port ${USER_PORT} with env ${process.env.USER_PORT}`);
}); 