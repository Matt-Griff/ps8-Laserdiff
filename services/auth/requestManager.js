const { parseBody } = require("./bodyparser/bodyparser");
const { registerUser, loginUser, refreshTokenExists } = require("./data/mongo");
const { create_access_token, verify_refresh_token } = require("./tokens/tokens");

const handleAuthRequest = async (request, response) => {
    
    const route = request.url.split("/").filter(elem => elem !== "..");

    if(route[3] === "login" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const { username, password } = data;
            
            const {user, accessToken, refreshToken} = await loginUser(username, password);
            
            if(!user) {
                response.statusCode = 401;
                response.end("Unauthorized");
                return;
            }

            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ 
                message: `User ${username} logged in successfully.`,
                accessToken: accessToken,
                refreshToken: refreshToken
            }),);

        } catch (error) {
            response.statusCode = 400;
            response.end("Invalid request");
        }
    } else if (route[3] === "register" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const { username, password } = data;

            const {user, accessToken, refreshToken} = await registerUser(username, password);

            if(!user) {
                response.statusCode = 400;
                response.end("Username already exists");
                return;
            }

            response.statusCode = 201;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ 
                message: `User ${username} registered successfully.`,
                accessToken: accessToken,
                refreshToken: refreshToken
            }));
        } catch (error) {
            response.statusCode = 400;
            response.end(`Registration failed: ${error.message}`);
        }
    } else {
        response.statusCode = 404;
        response.end("Not Found");
    }
}

const refreshTokenRequest = async (request, response) => {
    try {
        const data = await parseBody(request);
        const { username, refreshToken } = data;

        if(refreshTokenExists(refreshToken) && verify_refresh_token(refreshToken)) {
            const accessToken = create_access_token({ username });
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ accessToken }));
        } else {
            response.statusCode = 401;
            response.end("Invalid refresh token");
        }

    } catch (error) {
        response.statusCode = 400;
        response.end("Invalid request");
    }
}

module.exports = { handleAuthRequest, refreshTokenRequest };