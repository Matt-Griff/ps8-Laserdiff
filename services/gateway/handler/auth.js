const { parseBody } = require("../bodyparser/bodyparser");
const axios = require('axios');

const handleAuthRequest = async (request, response, filePath) => {
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

    if (filePath[3] === "login" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const { username, password } = data;


            const req = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, { username, password })
                .then(authRes => {
                    if (authRes.status === 200) {
                        response.statusCode = 200;
                        response.setHeader("Content-Type", "application/json");
                        const { accessToken, refreshToken } = authRes.data;
                        response.end(JSON.stringify({
                            message: `User ${username} logged in successfully.`,
                            accessToken,
                            refreshToken
                        }));
                    } else {
                        response.statusCode = authRes.status;
                        response.end(`Login failed for user ${username}`);
                    }
                })
                .catch(error => {
                    console.error(`Error during authentication: ${error.message}`);
                    response.statusCode = 401;
                    response.end("Username or password is incorrect");
                });


        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
        }

        return;
    }

    else if (filePath[3] === "signup" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const { username, password } = data;


            const req = await axios.post(`${AUTH_SERVICE_URL}/api/auth/register`, { username, password })
                .then(authRes => {
                    if (authRes.status === 201) {
                        response.statusCode = 201;
                        response.setHeader("Content-Type", "application/json");
                        const { accessToken, refreshToken } = authRes.data;
                        response.end(JSON.stringify({
                            message: `User ${username} registered successfully.`,
                            accessToken,
                            refreshToken
                        }));
                    }
                    else {
                        response.statusCode = authRes.status;
                        response.end(`Registration failed for user ${username}`);
                    }
                })
                .catch(error => {
                    console.error(`Error during registration: ${error.message}`);
                    response.statusCode = 401;
                    response.end("Username may already exist or invalid data provided");
                });


        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
        }

        return;

    } else if (filePath[3] === "is-logged-in" && request.method === "GET") {
        const token = request.headers['authorization'] || "";
        try {
            const authRes = await axios.get(`${AUTH_SERVICE_URL}/api/auth/is-logged-in`, {
                headers: { 'Authorization':  token}
            });
            if (authRes.status === 200) {
                response.statusCode = 200;
                response.setHeader("Content-Type", "application/json");
                response.end(JSON.stringify({ loggedIn: true, message: "User is logged in" }));
            } else {
                response.statusCode = authRes.status;
                response.setHeader("Content-Type", "application/json");
                response.end(JSON.stringify({ loggedIn: false, message: "User is not logged in" }));
            }
        } catch (error) {
            console.error(`Error checking login status: ${error.message}`);
            response.statusCode = 401;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ loggedIn: false, message: "User is not logged in" }));
        }
        return;

    }

    else if (filePath[3] === "refresh" && request.method === "POST") {
        try {
            console.log("Received token refresh request");
            const data = await parseBody(request);
            const { refreshToken } = data;
            const req = await axios.post(`${AUTH_SERVICE_URL}/api/auth/refresh`, { refreshToken })
                .then(authRes => {
                    if (authRes.status === 200) {
                        response.statusCode = 200;
                        response.setHeader("Content-Type", "application/json");
                        const { accessToken } = authRes.data;
                        response.end(JSON.stringify({ "newAccessToken": accessToken }));
                    }
                    else {
                        response.statusCode = authRes.status;
                        response.end(`Token refresh failed for user ${username}`);
                    }
                })
                .catch(error => {
                    console.error(`Error during token refresh: ${error.message}`);
                    response.statusCode = 401;
                    response.end("Invalid refresh token");
                });
        } catch (error) {
            console.error(`Error processing token refresh request: ${error.message}`);
            response.statusCode = 400;
            response.end("Invalid request");
        }
        return;
    }

    else {
        response.statusCode = 404;
        response.end("Not Found");
    }
}

module.exports = { handleAuthRequest };