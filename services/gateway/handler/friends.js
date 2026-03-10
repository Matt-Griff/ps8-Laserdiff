const { parseBody } = require("../bodyparser/bodyparser");
const axios = require('axios');


const handleFriends = async (request, response, filePath) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    response.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    response.setHeader("Access-Control-Allow-Credentials", "true");
    const FRIENDS_SERVICE_URL = process.env.FRIENDS_SERVICE_URL || "http://localhost:8004";
    const authHeader = request.headers['authorization'];

    if (request.method === "OPTIONS") {
        response.statusCode = 204;
        response.end();
        return;
    }

    try {
        console.log(`Handling friends request: ${request.method} ${request.url}`);
        if (request.method === "POST") {
            const body = await parseBody(request);
            const endpoint = filePath.slice(1).join("/");
            const serviceRes = await axios.post(`${FRIENDS_SERVICE_URL}/${endpoint}`, body, {
                headers: { "Authorization": authHeader, "Content-Type": "application/json" }
            });
            response.statusCode = serviceRes.status;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(serviceRes.data));
            return;
        }

        if (request.method === "GET") {
            const endpoint = filePath.slice(1).join("/");
            console.log(`Forwarding GET request to friends service: ${endpoint}`);
            const serviceRes = await axios.get(`${FRIENDS_SERVICE_URL}/${endpoint}`, {
                headers: { "Authorization": authHeader }
            });
            response.statusCode = serviceRes.status;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(serviceRes.data));
            return;
        }

        if (request.method === "DELETE") {
            const body = await parseBody(request);
            const endpoint = filePath.slice(1).join("/");
            const serviceRes = await axios.delete(`${FRIENDS_SERVICE_URL}/${endpoint}`, {
                headers: { "Authorization": authHeader, "Content-Type": "application/json" },
                data: body
            });
            response.statusCode = serviceRes.status;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(serviceRes.data));
            return;
        }
    } catch (error) {
        const status = error.response?.status || 500;
        const message = error.response?.data || "Internal Server Error";
        response.statusCode = status;
        response.end(JSON.stringify(message));
        return;
    }

    console.log("No route found for friends service");
    response.statusCode = 404;
    response.end("Not Found");
}

module.exports = { handleFriends };