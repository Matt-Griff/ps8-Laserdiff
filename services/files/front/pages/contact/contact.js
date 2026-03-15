import { getMyUserId } from "../../js/controllers/user-controller.js";
import { getAllUsers, sendFriendRequest, getFriendsList, getFriendRequests, revokeFriendship, answerFriendRequest, getFriendRequestsSent } from "../../js/friends/friend-command.js";

document.addEventListener("DOMContentLoaded", async () => {
    const searchInput = document.getElementById("search-input");
    let allUsersList = [];
    let friendsList = [];
    let friendRequestsSent = [];

    try {
        const sentRequests = await getFriendRequestsSent();
        friendRequestsSent = sentRequests.sentRequests || [];
    } catch (error) {
        console.error("Error fetching sent friend requests:", error);
    }

    try {
        const data = await getFriendsList();
        friendsList = data.friends || [];
        displayFriendsList(friendsList);
    } catch (error) {
        console.error("Error fetching friends:", error);
    }

    try {
        const data = await getAllUsers();
        allUsersList = data.users || [];
        const myUserId = await getMyUserId();
        allUsersList = allUsersList.filter(user => user.id !== myUserId);
        displayAllUsers(allUsersList, friendsList, friendRequestsSent);
    } catch (error) {
        console.error("Error fetching users:", error);
    }

    searchInput.addEventListener("input", () => {
        const filter = searchInput.value.toLowerCase();
        const userFiltered = allUsersList.filter(user => user.username.toLowerCase().includes(filter));
        displayAllUsers(userFiltered, friendsList, friendRequestsSent);
    });

    getFriendRequests().then(requests => {
        const requestsListElement = document.getElementById("incoming-requests-list");
        requestsListElement.innerHTML = "";
        requests.friendRequests.forEach(request => {
            const requestItem = document.createElement("div");
            requestItem.classList.add("user-item");
            requestItem.textContent = request.username;
            const acceptButton = document.createElement("button");
            acceptButton.textContent = "Accept";
            acceptButton.addEventListener("click", () => {
                answerFriendRequest(request.username, true).then(() => {
                    requestItem.remove();
                }).catch(error => {
                    console.error("Error accepting friend request:", error);
                });
            });

            const rejectButton = document.createElement("button");
            rejectButton.textContent = "Reject";
            rejectButton.addEventListener("click", () => {
                answerFriendRequest(request.username, false).then(() => {
                    requestItem.remove();
                }).catch(error => {
                    console.error("Error rejecting friend request:", error);
                });
            });

            const buttonContainer = document.createElement("div");
            buttonContainer.classList.add("button-container");
            buttonContainer.appendChild(acceptButton);
            buttonContainer.appendChild(rejectButton);
            requestItem.appendChild(buttonContainer);

            requestsListElement.appendChild(requestItem);
        });
    }).catch(error => {
        console.error("Error fetching friend requests:", error);
    });

});

const displayFriendsList = (friends) => {
    const friendsListElement = document.getElementById("friend-list");
    friendsListElement.innerHTML = "";
    friends.forEach(friend => {
        const friendItem = document.createElement("div");
        friendItem.classList.add("user-item");
        friendItem.textContent = friend.username;
        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove Friend";
        removeButton.addEventListener("click", () => {
            revokeFriendship(friend.username).then(() => {
                friendItem.remove();
            }).catch(error => {
                console.error("Error removing friend:", error);
            });
        });
        friendItem.appendChild(removeButton);
        friendsListElement.appendChild(friendItem);
    });
}

const displayAllUsers = (users, friends, sentRequests) => {
    const allUsersList = document.getElementById("user-list");
    allUsersList.innerHTML = "";
    users.forEach((user) => {
        const listItem = document.createElement("div");
        listItem.classList.add("user-item");
        listItem.textContent = user.username;
        const addButton = document.createElement("button");
        if (friends.some(friend => friend.username === user.username)) {
            addButton.textContent = "Already Friends";
            addButton.disabled = true;
        } else if (sentRequests.some(request => request.username === user.username)) {
            addButton.textContent = "Request Sent";
            addButton.disabled = true;
        } else {
            addButton.textContent = "Add Friend";
        }
        addButton.addEventListener("click", () => {
            addButton.disabled = true;
            sendFriendRequest(user.username);
        });

        const profileButton = document.createElement("button");
        profileButton.textContent = "View Profile";
        profileButton.addEventListener("click", () => {
            window.location.href = `/pages/profile/profile.html?user=${user.username}`;
        });

        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("button-container");
        buttonContainer.appendChild(profileButton);
        buttonContainer.appendChild(addButton);

        listItem.appendChild(buttonContainer);
        allUsersList.appendChild(listItem);
    });
}