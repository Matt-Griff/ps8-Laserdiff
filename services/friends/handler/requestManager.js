const { parseBody } = require("../bodyparser/bodyparser.js")
const { askToBeFriend, getFriendRequestsReceived, alreadySentRequest, acceptFriendRequest, refuseFriendRequest, getFriends, removeFriend, areFriend, getIdByUserName } = require("../data/mongo.js");
const jwt = require("jsonwebtoken");

const getUserIdFromToken = (token) => {
    const tokenD = token ? token.replace("Bearer ", "") : null;
    if (!tokenD) {
        return null;
    }
    const jwt_key = process.env.JWT_ACCESS_TOKEN_KEY || "default-jwt-key";
    try {
        const decoded = jwt.verify(tokenD, jwt_key);
        return decoded.id;
    } catch (error) {
        return null;
    }
};

const askToBeFriendRequest = async (request, response) => {
    const body = await parseBody(request);
    const token = request.headers["authorization"];
    const userId = getUserIdFromToken(token);
    if (!userId) {
        throwError(response, 401, "Unauthorized");
        return;
    }
    const { friendId } = body;
    if (!friendId) {
        throwError(response, 400, "Friend ID is required");
        return;
    }

    askToBeFriend(userId, friendId)
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
    const userId = getUserIdFromToken(token);
    if (!userId) {
        throwError(response, 401, "Unauthorized");
        return;
    }

    getFriendRequestsReceived(userId)
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
    const userId = getUserIdFromToken(token);
    if (!userId) {
        throwError(response, 401, "Unauthorized");
        return;
    }

    const body = await parseBody(request);
    const { friendId } = body;
    if (!friendId) {
        throwError(response, 400, "Friend ID is required");
        return;
    }

    acceptFriendRequest(userId, friendId)
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
    const userId = getUserIdFromToken(token);
    if (!userId) {
        throwError(response, 401, "Unauthorized");
        return;
    }

    const body = await parseBody(request);
    const { friendId } = body;
    if (!friendId) {
        throwError(response, 400, "Friend ID is required");
        return;
    }

    refuseFriendRequest(userId, friendId)
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
    const userId = getUserIdFromToken(token);
    if (!userId) {
        throwError(response, 401, "Unauthorized");
        return;
    }

    getFriends(userId)
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
    const userId = getUserIdFromToken(token);
    if (!userId) {
        throwError(response, 401, "Unauthorized");
        return;
    }

    const body = await parseBody(request);
    if (!body) {
        throwError(response, 400, "Invalid request body");
        return;
    }
    const { friendId } = body;
    if (!friendId) {
        throwError(response, 400, "Friend ID is required");
        return;
    }

    removeFriend(userId, friendId)
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
    const userId = getUserIdFromToken(token);
    if (!userId) {
        throwError(response, 401, "Unauthorized");
        return;
    }

    const { searchParams } = new URL(request.url, "http://localhost");
    const friendId = searchParams.get("friendId");
    if (!friendId) {
        throwError(response, 400, "Friend ID is required");
        return;
    }

    areFriend(userId, friendId)
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