const axios = require('axios');
const { parseBody } = require("../bodyparser/bodyparser");

const handleUser = async (request, response, filePath) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    response.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type,Authorization");
    response.setHeader("Access-Control-Allow-Credentials", "true");
    const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:8006";
    const authHeader = request.headers["authorization"];

    if (request.method === "OPTIONS") {
        response.statusCode = 204;
        response.end();
        return;
    }

    console.log(`Handling user request: ${request.url}`, filePath);
    if (filePath[3] === "me" && request.method === "GET") {
        const authHeader = request.headers['authorization'];
        try {
            await axios.get(`${USER_SERVICE_URL}/api/user/me`, {
                headers: {
                    "Authorization": authHeader
                }
            }).then(authRes => {
                if (authRes.status === 200) {
                    response.statusCode = 200;
                    response.setHeader("Content-Type", "application/json");
                    const { message, username, id, pp, elo } = authRes.data;
                    response.end(JSON.stringify({
                        message,
                        username,
                        id,
                        pp,
                        elo
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
            await axios.post(`${USER_SERVICE_URL}/api/user/${userId}`, {
                headers: {
                    "Authorization": request.headers['authorization'],
                }
            }).then(authRes => {
                console.log(`Auth service response: ${authRes.status} - ${JSON.stringify(authRes.data)}`);
                if (authRes.status === 200) {
                    response.statusCode = 200;
                    response.setHeader("Content-Type", "application/json");
                    const { message, username, id, pp, elo } = authRes.data;
                    response.end(JSON.stringify({
                        message,
                        username,
                        id,
                        pp,
                        elo
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

    try {
        console.log(`Handling user request: ${request.method} ${request.url}`);
        if (request.method === "POST") {
            const body = await parseBody(request);
            const endpoint = filePath.slice(1).join("/");
            const serviceRes = await axios.post(`${USER_SERVICE_URL}/${endpoint}`, body, {
                headers: { "Authorization": authHeader, "Content-Type": "application/json" }
            });
            response.statusCode = serviceRes.status;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(serviceRes.data));
            return;
        }

        if (request.method === "GET") {
            console.log(filePath);
            if (!new RegExp("^[a-zA-Z0-9_]+$").test(filePath[3])) {
                response.statusCode = 400;
                response.end("Invalid username format");
                return;
            }
            const endpoint = filePath.slice(1).join("/");
            console.log(`Forwarding GET request to user service: ${endpoint}` + ` with endpoint: ${USER_SERVICE_URL}/${endpoint}`);
            const serviceRes = await axios.get(`${USER_SERVICE_URL}/${endpoint}`, {
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
            const serviceRes = await axios.delete(`${USER_SERVICE_URL}/${endpoint}`, {
                headers: { "Authorization": authHeader, "Content-Type": "application/json" },
                data: body
            });
            response.statusCode = serviceRes.status;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify(serviceRes.data));
            return;
        }

        if (request.method === "PUT") {
            const body = await parseBody(request);
            const endpoint = filePath.slice(1).join("/");
            if(endpoint.includes("elo")) {
                response.statusCode = 400;
                response.end("Elo updates are not allowed through this endpoint");
                return;
            }
            const serviceRes = await axios.put(`${USER_SERVICE_URL}/${endpoint}`, body, {
                headers: { "Authorization": authHeader, "Content-Type": "application/json" }
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

    console.log("No route found for user service");

    console.log(filePath);
    response.statusCode = 404;
    response.end("Not Found");
}

const getUserIdFromToken = async (token) => {
    const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:8006";
    try {
        const res = await axios.get(`${USER_SERVICE_URL}/api/user/me`, {
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

const getUsernameFromToken = async (token) => {
    const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:8006";
    try {
        const res = await axios.get(`${USER_SERVICE_URL}/api/user/me`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (res.status === 200) {
            return res.data.username;
        } else {
            console.error(`Failed to retrieve username, status code: ${res.status}`);
            return null;
        }
    } catch (error) {
        console.error(`Error retrieving username: ${error.message}`);
        return null;
    }
}

module.exports = { handleUser, getUserIdFromToken, getUsernameFromToken };