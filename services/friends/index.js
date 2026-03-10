const http = require("http");
const { askToBeFriendRequest, getFriendRequestsReceivedRequest, acceptFriendRequestRequest, refuseFriendRequestRequest, getFriendsListRequest, removeFriendRequest, isFriendRequest } = require("./handler/requestManager.js");
const FRIEND_PORT = 8004;

http.createServer(function (request, response) {
    console.log(`Recieved query : ${request.url}`);

    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    response.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    response.setHeader("Access-Control-Allow-Credentials", "true");

    if (request.method === "OPTIONS") {
        response.statusCode = 204;
        response.end();
        return;
    }

    if (request.url.startsWith("/api/friends/requests/ask") && request.method === "POST") {
        askToBeFriendRequest(request, response);
        return;
    }

    if (request.url.startsWith("/api/friends/requests/received") && request.method === "POST") {
        getFriendRequestsReceivedRequest(request, response);
        return;
    }

    if (request.url.startsWith("/api/friends/requests/accept") && request.method === "POST") {
        acceptFriendRequestRequest(request, response);
        return;
    }

    if (request.url.startsWith("/api/friends/requests/reject") && request.method === "POST") {
        refuseFriendRequestRequest(request, response);
        return;
    }

    if (request.url.startsWith("/api/friends") && request.method === "GET") {
        getFriendsListRequest(request, response);
        return;
    }

    if (request.url.startsWith("/api/friends") && request.method === "DELETE") {
        removeFriendRequest(request, response);
        return;
    }

    if (request.url.startsWith("/api/friends/is-friend") && request.method === "GET") {
        isFriendRequest(request, response);
        return;
    }

    console.log(`Friend-Service : No route found for ${request.url}`);
    response.statusCode = 404;
    response.end("Not Found");


}).listen(FRIEND_PORT, () => {
    console.log(`Friends service is running on port ${FRIEND_PORT}`);
}); 