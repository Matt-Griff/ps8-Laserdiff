const { parseBody } = require("../bodyparser/bodyparser.js")
const { askToBeFriend, getFriendRequestsReceived, alreadySentRequest, acceptFriendRequest, refuseFriendRequest, getFriends, removeFriend, areFriend } = require("../data/mongo.js");
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

const askToBeFriendRequest = async (request, response) => {
    const body = await parseBody(request);
    const token = request.headers["authorization"];
    const username = getUsernameFromToken(token);
    if (!username) {
        throwError(response, 401, "Unauthorized");
        return;
    }
    const { friendname } = body;
    if (!friendname) {
        throwError(response, 400, "Friend name is required");
        return;
    }

    askToBeFriend(username, friendname)
        .then(() => {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: "Friend request sent successfully"
            }));
        })
        .catch((error) => {
            throwError(response, 500, "An error occurred while sending friend request", error.message);
            return;
        });
}

const getFriendRequestsReceivedRequest = async (request, response) => {
    const token = request.headers["authorization"];
    const username = getUsernameFromToken(token);
    if (!username) {
        throwError(response, 401, "Unauthorized");
        return;
    }

    getFriendRequestsReceived(username)
        .then((friendRequests) => {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: "Friend requests received fetched successfully",
                friendRequests
            }));
        })
        .catch((error) => {
            throwError(response, 500, "An error occurred while fetching friend requests", error.message);
            return;
        });
}

const acceptFriendRequestRequest = async (request, response) => {
    const token = request.headers["authorization"];
    const username = getUsernameFromToken(token);
    if (!username) {
        throwError(response, 401, "Unauthorized");
        return;
    }

    const body = await parseBody(request);
    const { friendname } = body;
    if (!friendname) {
        throwError(response, 400, "Friend name is required");
        return;
    }

    acceptFriendRequest(username, friendname)
        .then(() => {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: "Friend request accepted successfully"
            }));
        })
        .catch((error) => {
            throwError(response, 500, "An error occurred while accepting friend request", error.message);
            return;
        });
}

const refuseFriendRequestRequest = async (request, response) => {
    const token = request.headers["authorization"];
    const username = getUsernameFromToken(token);
    if (!username) {
        throwError(response, 401, "Unauthorized");
        return;
    }

    const body = await parseBody(request);
    const { friendname } = body;
    if (!friendname) {
        throwError(response, 400, "Friend name is required");
        return;
    }

    refuseFriendRequest(username, friendname)
        .then(() => {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: "Friend request refused successfully"
            }));
        })
        .catch((error) => {
            throwError(response, 500, "An error occurred while refusing friend request", error.message);
            return;
        });
}

const getFriendsListRequest = async (request, response) => {
    const token = request.headers["authorization"];
    const username = getUsernameFromToken(token);
    if (!username) {
        throwError(response, 401, "Unauthorized");
        return;
    }

    getFriends(username)
        .then((friends) => {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: "Friends list fetched successfully",
                friends
            }));
        })
        .catch((error) => {
            throwError(response, 500, "An error occurred while fetching friends list", error.message);
        });
}

const removeFriendRequest = async (request, response) => {
    const token = request.headers["authorization"];
    const username = getUsernameFromToken(token);
    if (!username) {
        throwError(response, 401, "Unauthorized");
        return;
    }

    const body = await parseBody(request);
    if (!body) {
        throwError(response, 400, "Invalid request body");
        return;
    }
    const { friendname } = body;
    if (!friendname) {
        throwError(response, 400, "Friend name is required");
        return;
    }

    removeFriend(username, friendname)
        .then(() => {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: "Friend removed successfully"
            }));
        })
        .catch((error) => {
            throwError(response, 500, "An error occurred while removing friend", error.message);
        });
}

const isFriendRequest = async (request, response) => {
    const token = request.headers["authorization"];
    const username = getUsernameFromToken(token);
    if (!username) {
        throwError(response, 401, "Unauthorized");
        return;
    }

    const { searchParams } = new URL(request.url, "http://localhost");
    const friendname = searchParams.get("friendname");
    if (!friendname) {
        throwError(response, 400, "Friend name is required");
        return;
    }

    areFriend(username, friendname)
        .then((isFriend) => {
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({
                message: "Friendship status checked successfully",
                isFriend
            }));
        })
        .catch((error) => {
            throwError(response, 500, "An error occurred while checking friendship status", error.message);
        });
}

const throwError = (response, statusCode, message, error = null) => {
    response.statusCode = statusCode;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({
        message
    }));
    if (error) {
        console.error(error);
    }
}

module.exports = { askToBeFriendRequest, getFriendRequestsReceivedRequest, acceptFriendRequestRequest, refuseFriendRequestRequest, getFriendsListRequest, removeFriendRequest, isFriendRequest };    