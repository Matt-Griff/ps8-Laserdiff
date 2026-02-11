const { hostname } = require("os");
const { parseBody } = require("../bodyparser/bodyparser");
const http = require("http");

const handleAuthRequest = async (request, response, filePath) => {
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8192";

    const host = AUTH_SERVICE_URL.split("://")[1].split(":")[0];
    const port = AUTH_SERVICE_URL.split(":")[2];

    if(filePath[3] === "login" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const { username, password } = data;

            const options = {
                hostname: host,
                port: port,
                path: '/api/auth/login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }

            const authReq = http.request(options, async (authRes) => {
                let body = "";
                authRes.on('data', (chunk) => {
                    body+= chunk.toString();
                });
                
                authRes.on('end', () => {
                    console.log('No more data in response.');

                    if(authRes.statusCode === 200) {
                        response.statusCode = 200;
                        response.setHeader("Content-Type", "application/json");
                        const accessToken = JSON.parse(body).accessToken;
                        const refreshToken = JSON.parse(body).refreshToken;
                        response.end(JSON.stringify({ 
                            message: `User ${username} logged in successfully.`,
                            accessToken,
                            refreshToken
                        }));
                    } else {
                        response.statusCode = authRes.statusCode;
                        response.end(`Login failed for user ${username}`);
                    }
                });
                

            });
            
            authReq.on('error', (error) => {
                console.error(`Problem with request: ${error.message}`);
                response.statusCode = 500;
                response.end("Internal server error");
            });

            authReq.write(JSON.stringify({ username, password }));
            authReq.end();
            
           
        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
        }
    }

    else if (filePath[3] === "signup" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const {username, password} = data;
            
            const options = {
                hostname: host,
                port: port,
                path: '/api/auth/register',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }

            const authReq = http.request(options, async (authRes) => {
                let body = "";
                authRes.on('data', (chunk) => {
                    body+= chunk.toString();
                });
                
                authRes.on('end', () => {
                    console.log('No more data in response.');

                    if(authRes.statusCode === 201) {
                        response.statusCode = 201;
                        response.setHeader("Content-Type", "application/json");
                        const accessToken = JSON.parse(body).accessToken;
                        const refreshToken = JSON.parse(body).refreshToken;

                        response.end(JSON.stringify({ message: `User ${username} registered successfully.`, accessToken, refreshToken }));
                    } else {
                        response.statusCode = authRes.statusCode;
                        response.end(`Register failed for user ${username}` + `: ${JSON.parse(body).message}`);
                    }
                });
                

            });
            
            authReq.on('error', (error) => {
                console.error(`Problem with request: ${error.message}`);
                response.statusCode = 500;
                response.end("Internal server error");
            });

            authReq.write(JSON.stringify({ username, password }));
            authReq.end();
            
           
        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
        }
    }
}

module.exports = { handleAuthRequest };