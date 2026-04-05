// The http module contains methods to handle http queries.
const http = require('http');
const httpProxy = require('http-proxy');
const { handleAuthRequest } = require('./handler/auth');
const { handleSocketIoRequests } = require('./handler/socketIo');
const { checkToken } = require('./auth/jwt-checking');
const { handleUser } = require('./handler/user');
const { handlePublicRequest } = require('./handler/public');
const { handleFriends } = require('./handler/friends');
const { handleRankRequest, handleHistoryRequest } = require('./handler/ranking');

// We will need a proxy to send requests to the other services.
const proxy = httpProxy.createProxyServer();

const FILES_SERVICE_URL = process.env.FILES_SERVICE_URL || "http://localhost:8001";
const GATEWAY_PORT = process.env.GATEWAY_PORT || 8000;


/* The http module contains a createServer function, which takes one argument, which is the function that
** will be called whenever a new request arrives to the server.
 */
const server = http.createServer(function (request, response) {
    // First, let's check the URL to see if it's a REST request or a file request.
    // We will remove all cases of "../" in the url for security purposes.
    let filePath = request.url.split("/").filter(function (elem) {
        return elem !== "..";
    });

    console.log(`Received request for ${request.url}`);

    if (request.method === "OPTIONS") {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        response.setHeader('Access-Control-Allow-Credentials', "true");
        response.statusCode = 204;
        response.end();
        return;
    }

    try {
        // If the URL starts by /api, then it's a REST request (you can change that if you want).
        if (filePath[1] === "api") {
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
            response.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
            response.setHeader("Access-Control-Allow-Credentials", "true");

            if (request.method === "OPTIONS") {
                response.statusCode = 204;
                response.end();
                return;
            }

            if (filePath[2] === "status") {
                response.statusCode = 200;
                response.end("Gateway is up");
                return;
            }

            if (filePath[2] === "auth") {
                handleAuthRequest(request, response, filePath);
                return;
            }

            if (filePath[2] === "public") {
                handlePublicRequest(request, response, filePath);
                return;
            }

            if((filePath.includes("league") || filePath.includes("leaderboard")) && request.method === "GET") {
                handleRankRequest(request, response, filePath);
                return;
            }

            if(filePath.includes("games") && request.method === "GET") {
                handleHistoryRequest(request, response, filePath);
                return;
             }

            if (!checkToken(request)) {
                response.statusCode = 403;
                response.end("Unauthorized");
                return;
            }

            if(filePath.includes("games")) {
                handleHistoryRequest(request, response, filePath);
                return;
            }

            switch (filePath[2]) {
                case 'user':
                    handleUser(request, response, filePath);
                    return;
                case 'friends':
                    handleFriends(request, response, filePath);
                    return;
                case 'ranking':
                    handleRankRequest(request, response, filePath);
                    return;        
                default:
                    response.statusCode = 404;
                    response.end("Endpoint not found");
                    break;
            }

            //TODO: Add middlewares and call microservices depending on the request.

            // If it doesn't start by /api, then it's a request for a file.
        } else if (filePath[1] === "socket.io") {
            // Let's proxy the request to the game service
            return;
            // If it doesn't start by /api, then it's a request for a file.
        } else {
            proxy.web(request, response, { target: FILES_SERVICE_URL });
        }

    } catch (error) {
        console.log(`error while processing ${request.url}: ${error}`)
        response.statusCode = 400;
        response.end(`Something in your request (${request.url}) is strange...`);
    }
    // For the server to be listening to request, it needs a port, which is set thanks to the listen function.
}).listen(GATEWAY_PORT);

handleSocketIoRequests(server);
