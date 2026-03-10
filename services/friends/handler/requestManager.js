const { addFriend, askToBeFriend, getFriendRequestsReceived, alreadySentRequest, acceptFriendRequest, refuseFriendRequest, getFriends, removeFriend, areFriend, getIdByUserName } = require("../data/mongo.js");

const askToBeFriendRequest = async (request, response) => {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({
        message: "Request to be friend sent successfully"
    }));
}

const getFriendRequestsReceivedRequest = async (request, response) => {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({
        message: "Friend requests received fetched successfully"
    }));
}

const acceptFriendRequestRequest = async (request, response) => {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({
        message: "Friend request accepted successfully"
    }));
}

const refuseFriendRequestRequest = async (request, response) => {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({
        message: "Friend request refused successfully"
    }));
}

const getFriendsListRequest = async (request, response) => {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({
        message: "Friends list fetched successfully"
    }));
}

const removeFriendRequest = async (request, response) => {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({
        message: "Friend removed successfully"
    }));
}

const isFriendRequest = async (request, response) => {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({
        message: "Friendship status checked successfully"
    }));
}

module.exports = { askToBeFriendRequest, getFriendRequestsReceivedRequest, acceptFriendRequestRequest, refuseFriendRequestRequest, getFriendsListRequest, removeFriendRequest, isFriendRequest };    