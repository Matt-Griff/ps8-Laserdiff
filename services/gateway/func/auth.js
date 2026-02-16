const { parseBody } = require("../bodyparser/bodyparser");
const http = require("http");
const axios = require('axios');

const handleAuthRequest = async (request, response, filePath) => {
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8192";

    const host = AUTH_SERVICE_URL.split("://")[1].split(":")[0];
    const port = AUTH_SERVICE_URL.split(":")[2];

    if(filePath[3] === "login" && request.method === "POST") {
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
    }

    else if (filePath[3] === "signup" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const {username, password} = data;
            

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
    }
}

module.exports = { handleAuthRequest };