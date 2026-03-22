const { parseBody } = require("../bodyparser/bodyparser.js")
const { getUser, updateUser } = require("../mongo/mongo.js");
const jwt = require("jsonwebtoken");

const getUsernameFromToken = (token) => {
    const tokenD = token ? token.replace("Bearer ", "") : null;
    if (!tokenD) {
        return null;
    }
    const jwt_key = process.env.JWT_ACCESS_TOKEN_KEY || "default-jwt-key";
    try {
        const decoded = jwt.verify(tokenD, jwt_key);
        return decoded.username;
    } catch (error) {
        return null;
    }
};

const handleUpdateUserInfo = async (request, response) => {
    const body = await parseBody(request);
    const token = request.headers["authorization"];
    const username = getUsernameFromToken(token);

    if (!username) {
        response.statusCode = 401;
        response.end("Unauthorized");
        return;
    }

    const { pp } = body;
    if (!pp) {
        response.statusCode = 400;
        response.end("Profile picture URL is required");
        return;
    }

    try {
        const updateRes = await updateUser(username, { pp });

        if (!updateRes || updateRes.matchedCount === 0) {
            response.statusCode = 404;
            response.end("User not found");
            return;
        }

        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({
            message: "User updated successfully",
            username,
        }));
    } catch (error) {
        response.statusCode = 500;
        response.end("Internal Server Error: " + error.message);
    }
};

const handleGetUserInfo = async (request, response) => {
    const token = request.headers["authorization"];
    const username = getUsernameFromToken(token);
    if (!username) {
        response.statusCode = 401;
        response.end("Unauthorized");
        return;
    }

    getUser(username).then(user => {
        if (!user) {
            response.statusCode = 404;
            response.end("User not found");
            return;
        }
        if (!user.pp) {
            user.pp = "https://static.bigbrain.gg/assets/lol/riot_static/16.4.1/img/profileicon/29.png";
        }
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({
            username: user.username,
            userId: user._id,
            pp: user.pp
        }));
    }).catch(error => {
        response.statusCode = 500;
        response.end("Internal Server Error: " + error.message);
    });
}

module.exports = {
    handleUpdateUserInfo,
    handleGetUserInfo
};