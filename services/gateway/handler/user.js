const axios = require('axios');

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
    if (filePath[3] === "info" && request.method === "GET") {
        const authHeader = request.headers['authorization'];
        try {
            await axios.get(`${AUTH_SERVICE_URL}/api/user/info`, {
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
    }

    else {
        console.log(filePath);
        response.statusCode = 404;
        response.end("Not Found");
    }
}

module.exports = { handleUser };