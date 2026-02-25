const { parseBody } = require("./bodyparser/bodyparser");
const { registerUser, loginUser, refreshTokenExists, get_user_from_id } = require("./data/mongo");
const { create_access_token, verify_refresh_token, get_user_from_token, verify_access_token, create_access_token_from_refresh_token } = require("./tokens/tokens");

const handleAuthRequest = async (request, response) => {

    const route = request.url.split("/").filter(elem => elem !== "..");

    if (route[3] === "login" && request.method === "POST") {
        try {
            const data = await parseBody(request);
            const { username, password } = data;

            const result = await loginUser(username, password);

            if (!result) {
                response.statusCode = 401;
                response.end("Unauthorized");
                return;
            }

            const { user, accessToken, refreshToken } = result;

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

            const { user, accessToken, refreshToken } = await registerUser(username, password);

            if (!user) {
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
        console.log(`AuthMS : Received refresh token request`);
        const data = await parseBody(request);
        const { refreshToken } = data;

        const decoded = verify_refresh_token(refreshToken);
        if (!decoded) {
            response.statusCode = 401;
            response.end("Invalid refresh token");
            return;
        }

        const tokenExists = await refreshTokenExists(decoded.id, refreshToken);
        if (!tokenExists) {
            response.statusCode = 401;
            response.end("Invalid refresh token");
            return;
        }

        const accessToken = create_access_token_from_refresh_token(refreshToken);
        console.log(`AuthMS : new access token created from refresh token`);
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ accessToken }));

    } catch (error) {
        console.error(`AuthMS : Error handling refresh token request: ${error.message}`);
        response.statusCode = 400;
        response.end("Invalid request");
    }
}

const handleMyInfo = async (request, response) => {
    try {
        const jwt_token = await request.headers["authorization"];
        const userInfo = get_user_from_token(jwt_token);
        if (userInfo) {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: `User info for ${userInfo.username}`,
                username: userInfo.username,
                id: userInfo.id
            }));
        } else {
            response.statusCode = 401;
            response.end("Invalid access token");
        }
    } catch (error) {
        response.statusCode = 400;
        response.end("Invalid request");
    }
}

const handleIsLoggedIn = async (request, response) => {
    try {
        const jwt_token = await request.headers["authorization"];
        const user = get_user_from_token(jwt_token);
        if (user) {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                loggedIn: true,
                message: "User is logged in"
            }));
        } else {
            response.statusCode = 401;
            response.end(JSON.stringify({
                loggedIn: false,
                message: "User is not logged in"
            }));
        }
    } catch (error) {
        response.statusCode = 400;
        response.end("Invalid request");
    }
}

const handleUserInfo = async (request, response) => {
    try {
        const filePath = request.url.split("/").filter(elem => elem !== "..");
        const userId = filePath[3];
        const user = await get_user_from_id(userId)
        if (user) {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: `User info for ${user.username}`,
                username: user.username,
                id: user.id
            }));
        }
        else {
            console.log(`User with ID ${userId} not found`);
            response.statusCode = 404;
            response.end("User not found");
        }
    } catch (error) {
        console.error(`Error handling user info request: ${error.message}`);
        response.statusCode = 400;
        response.end("Invalid request");
    }
}

module.exports = { handleAuthRequest, refreshTokenRequest, handleUserInfo, handleIsLoggedIn, handleMyInfo };