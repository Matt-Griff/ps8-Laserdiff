// The http module contains methods to handle http queries.
const http = require('http');
const httpProxy = require('http-proxy');
const { handleAuthRequest } = require('./func/auth');
const { handleSocketIoRequests } = require('./handler/socketIoHandler');

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
    
    if(request.method === "OPTIONS") {
        response["Access-Control-Allow-Origin"] = "*";
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, PUT, PATCH, DELETE";
        response["Access-Control-Allow-Headers"] = "X-Requested-With,content-type";
        response["Access-Control-Allow-Credentials"] = true;
        response.statusCode = 204;
        response.end();
        return;
    }
    try {
        // If the URL starts by /api, then it's a REST request (you can change that if you want).
        if (filePath[1] === "api") {
            switch(filePath[2]) {
                case 'auth':
                    handleAuthRequest(request, response, filePath);
                    break;
                default:
                    break;
            }
            
            //TODO: Add middlewares and call microservices depending on the request.

            // If it doesn't start by /api, then it's a request for a file.
        } else if (filePath[1] === "socket.io") {
            // Let's proxy the request to the game service
            return;
        // If it doesn't start by /api, then it's a request for a file.
        } else {
            console.log("Request for a file received, transferring to the file service")
            proxy.web(request, response, {target: FILES_SERVICE_URL});
        }

    } catch (error) {
        console.log(`error while processing ${request.url}: ${error}`)
        response.statusCode = 400;
        response.end(`Something in your request (${request.url}) is strange...`);
    }
    // For the server to be listening to request, it needs a port, which is set thanks to the listen function.
}).listen(GATEWAY_PORT);

handleSocketIoRequests(server);
