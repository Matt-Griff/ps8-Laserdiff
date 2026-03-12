import { getMyUserId } from "../../js/controllers/user-controller.js";
import { getAllUsers, sendFriendRequest, getFriendsList, getFriendRequests, revokeFriendship, acceptFriendRequest } from "../../js/friends/friend-command.js";

document.addEventListener("DOMContentLoaded", () => {
    getAllUsers().then((data) => {
        const userList = document.getElementById("user-list");
        const myUserId = getMyUserId();
        data.users.forEach((user) => {
            if (user.id === myUserId) {
                return;
            }
            const listItem = document.createElement("li");
            listItem.textContent = user.username;

            const friendButton = document.createElement("button");
            friendButton.textContent = "Add Friend";
            friendButton.addEventListener("click", () => {
                friendButton.disabled = true;
                sendFriendRequest(user.id);
            });
            listItem.appendChild(friendButton);
            userList.appendChild(listItem);
        });
    }).catch((error) => {
        console.error("Error fetching public data:", error);
    });

    getFriendsList().then((data) => {
        const friendsList = document.getElementById("friend-list");
        data.friends.forEach((friend) => {
            const listItem = document.createElement("li");
            listItem.textContent = friend.id;
            const revokeButton = document.createElement("button")
            revokeButton.textContent = "Revoke Friendship";
            revokeButton.addEventListener("click", () => {
                revokeButton.disabled = true;
                revokeFriendship(friend.id);
            });
            listItem.appendChild(revokeButton);
            friendsList.appendChild(listItem);
        });
    }
    ).catch((error) => {
        console.error("Error fetching friends list:", error);
    });

    getFriendRequests().then((data) => {
        const requestsList = document.getElementById("request-list");
        data.friendRequests.forEach((request) => {
            const listItem = document.createElement("li");
            listItem.textContent = request.id;
            const acceptButton = document.createElement("button");
            acceptButton.textContent = "Accept";
            acceptButton.addEventListener("click", () => {
                acceptButton.disabled = true;
                acceptFriendRequest(request.id);
            });
            listItem.appendChild(acceptButton);
            requestsList.appendChild(listItem);
        });
    }).catch((error) => {
        console.error("Error fetching friend requests:", error);
    });

});