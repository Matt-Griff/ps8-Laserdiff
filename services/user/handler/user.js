const { parseBody } = require("../bodyparser/bodyparser.js")
const { getUser, updateUser, getUserStatus, updateUserStatus, updateUserStatusFromId, getElo, updateElo } = require("../mongo/mongo.js");
const jwt = require("jsonwebtoken");

const handleGetUserInfo = async (request, response) => {
    const username = request.url.split("/")[3];
    if(!username) {
        response.statusCode = 400;
        response.end("Username is required in the URL");
        return;
    }

    if(request.url.includes("status")) {
        const status = await getUserStatus(username);
        if(status) {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: "User status retrieved successfully",
                status
             }));
        }
        else {
            response.statusCode = 404;
            response.end("User not found");
        }
    } else if(request.url.includes("elo")) {
        const elo = await getElo(username);
        if(elo !== null) {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: "User elo retrieved successfully",
                elo
             }));
        }
    } else {
        handleGetFullUserInfo(username, request, response);
    }
}


const handleGetFullUserInfo = async (username, request, response) => {
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
            pp: user.pp,
            elo: user.elo,
        }));
    }).catch(error => {
        response.statusCode = 500;
        response.end("Internal Server Error: " + error.message);
    });
}


const handleUpdateUserInfo = async (request, response) => {
    const body = await parseBody(request);
    const username = request.url.split("/")[3];

    if(!username) {
        response.statusCode = 400;
        response.end("Username is required in the URL");
        return;
    }

    if(request.url.includes("status")) {
        const { status } = body;
        if(!status) {
            response.statusCode = 400;
            response.end("Status is required in the request body");
            return;
        }
        try {
            if(username.length > 20) {
                // It is a id, not a username, so redirecting to another function
                return await handleUpdateUserStatus(username, status, response);
            }
            const res = await updateUserStatus(username, status);

            if(!res || res.matchedCount === 0) {
                response.statusCode = 404;
                response.end("User not found");
                return;
            }
            
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: "User status updated successfully",
                username,
                status
            }));
        } catch (error) {
            response.statusCode = 500;
            response.end("Internal Server Error: " + error.message);
        }
        return;
    }

    if(request.url.includes("elo")) {
        const { elo } = body;
        
        if(elo === undefined) {
            response.statusCode = 400;
            response.end("Elo is required in the request body");
            return;
        }

        try {
            const res = await updateElo(username, elo);
            if(!res || res.matchedCount === 0) {
                response.statusCode = 404;
                response.end("User not found");
                return;
            }
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: "User elo updated successfully",
                username,
                elo
            }));
        } catch (error) {
            response.statusCode = 500;
            response.end("Internal Server Error: " + error.message);
        }

        return ;
    }


    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        response.statusCode = 401;
        response.end("Unauthorized: No token provided");
        return;
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_KEY);
    } catch (err) {
        response.statusCode = 401;
        response.end("Unauthorized: Invalid token");
        return;
    }

    if(decoded.username !== username) {
        response.statusCode = 403;
        response.end("Forbidden: You can only update your own profile");
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

const handleUpdateUserStatus = async (userId, status, response) => {
    try {
        const res = await updateUserStatusFromId(userId, status);

        if(!res || res.matchedCount === 0) {
            response.statusCode = 404;
            response.end("User not found");
            return;
        }

        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({
            message: "User status updated successfully",
            userId,
            status
        }));
    } catch (error) {
        response.statusCode = 500;
        response.end("Internal Server Error: " + error.message);
    }
}

module.exports = {
    handleUpdateUserInfo,
    handleGetUserInfo
};