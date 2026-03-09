const { parseBody } = require("../bodyparser/bodyparser");
const axios = require('axios');
const { URL } = require('url');


const handlePublicRequest = async (request, response, filePath) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    response.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    response.setHeader("Access-Control-Allow-Credentials", "true");
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8192";

    if (request.method === "OPTIONS") {
        response.statusCode = 204;
        response.end();
        return;
    }

    if (filePath[3].split("?")[0] === "user" && request.method === "GET") {
        try {
            const url = new URL(request.url, `http://${request.headers.host}`);
            const userId = url.searchParams.get('userId');
            const req = axios.post(`${AUTH_SERVICE_URL}/api/user/${userId}`);
            const authResponse = await req;
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(authResponse.data));

            if (!userId) {
                response.statusCode = 400;
                response.end("Missing userId parameter");
                return;
            }

        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
        }
    } else if (filePath[3] === "users" && request.method === "GET") {
        try {
            const req = axios.get(`${AUTH_SERVICE_URL}/api/users`);
            const authResponse = await req;
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(authResponse.data));
        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
        }
    }

    else {
        console.log(`No route found for ${request.url} in public handler`);
        response.statusCode = 404;
        response.end("Not Found");
    }
}

module.exports = { handlePublicRequest };