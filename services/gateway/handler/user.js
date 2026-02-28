const axios = require('axios');
const { parseBody } = require("../bodyparser/bodyparser");

const handleUser = async (request, response, filePath) => {
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

    console.log(`Handling user request: ${request.url}`, filePath);
    if (filePath[3] === "me" && request.method === "GET") {
        const authHeader = request.headers['authorization'];
        try {
            await axios.get(`${AUTH_SERVICE_URL}/api/user/me`, {
                headers: {
                    "Authorization": authHeader
                }
            }).then(authRes => {
                if (authRes.status === 200) {
                    response.statusCode = 200;
                    response.setHeader("Content-Type", "application/json");
                    const { message, username, id } = authRes.data;
                    response.end(JSON.stringify({
                        message,
                        username,
                        id
                    }));
                } else {
                    response.statusCode = authRes.status;
                    response.end(`Failed to retrieve user info`);
                }
            }).catch(error => {
                console.error(`Error retrieving user info: ${error.message}`);
                response.statusCode = 401;
                response.end("Unauthorized");
            });
        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
        }

        return;
    } else if (filePath[3] === "info" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const { userId } = data;
            console.log(`Retrieving info for user ID: ${userId}`);
            await axios.post(`${AUTH_SERVICE_URL}/api/user/${userId}`, {
                headers: {
                    "Authorization": request.headers['authorization'],
                }
            }).then(authRes => {
                console.log(`Auth service response: ${authRes.status} - ${JSON.stringify(authRes.data)}`);
                if (authRes.status === 200) {
                    response.statusCode = 200;
                    response.setHeader("Content-Type", "application/json");
                    const { message, username, id } = authRes.data;
                    response.end(JSON.stringify({
                        message,
                        username,
                        id
                    }));
                }
                else {
                    response.statusCode = authRes.status;
                    response.end(`Failed to retrieve user info`);
                }
            }).catch(error => {
                console.error(`Error retrieving user info: ${error.message}`);
                response.statusCode = 401;
                response.end("Unauthorized");
            });
        } catch (error) {
            console.error(`Error handling user info request: ${error.message}`);
            response.statusCode = 400;
            response.end("Invalid request");
        }
    }

    else {
        console.log(filePath);
        response.statusCode = 404;
        response.end("Not Found");
    }
}

const getUserIdFromToken = async (token) => {
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8192";
    try {
        const res = await axios.get(`${AUTH_SERVICE_URL}/api/user/me`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (res.status === 200) {
            return res.data.id;
        } else {
            console.error(`Failed to retrieve user ID, status code: ${res.status}`);
            return null;
        }
    } catch (error) {
        console.error(`Error retrieving user ID: ${error.message}`);
        return null;
    }
}

module.exports = { handleUser, getUserIdFromToken };