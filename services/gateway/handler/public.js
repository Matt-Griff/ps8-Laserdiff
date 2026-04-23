const axios = require('axios');


const handlePublicRequest = async (request, response, filePath) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    response.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type,Authorization");
    response.setHeader("Access-Control-Allow-Credentials", "true");
    const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:8006";

    if (request.method === "OPTIONS") {
        response.statusCode = 204;
        response.end();
        return;
    }

    if(filePath[2] === "league-thresholds" && request.method === "GET") {
        try {
            const req = axios.get(`${process.env.RANKING_SERVICE_URL}/api/league-thresholds`);
            const thresholdsResponse = await req;
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(thresholdsResponse.data));
            return;
        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
            return;
        }
    }

    if (filePath[3] === "user" && filePath[4] !== undefined && request.method === "GET") {
        try {
            const username = filePath[4];
            if (!username) {
                response.statusCode = 400;
                response.end("Missing username parameter");
                return;
            }

            const req = axios.get(`${USER_SERVICE_URL}/api/user/${username}`);
            const userResponse = await req;
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(userResponse.data));
        } catch (error) {
            response.statusCode = error.response?.status || 400;
            response.end(typeof error.response?.data === "string" ? error.response.data : "Invalid request");
        }
    } else if (filePath[3] === "users" && request.method === "GET") {
        try {
            const req = axios.get(`${USER_SERVICE_URL}/api/users`);
            const userResponse = await req;
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(userResponse.data));
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