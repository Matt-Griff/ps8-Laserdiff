import { getMyUserId } from "../../js/controllers/user-controller.js";
import { getAllUsers, sendFriendRequest, getFriendsList, getFriendRequests, revokeFriendship, answerFriendRequest, getFriendRequestsSent } from "../../js/friends/friend-command.js";
import { isloggedIn } from "../../js/auth/is-logged.js";

document.addEventListener("DOMContentLoaded", async () => {
    const loggedIn = await isloggedIn();

    try {
        await import("../../components/burger-menu/burger-menu.js");

        if (loggedIn) {
            await Promise.all([
                import("../../js/socket/socket.io.js"),
                import("../../components/notification-duel/notification-duel.js"),
                import("../../js/socket/notification-duel-receiver.js"),
            ]);
        }
    } catch (error) {
        console.error("Error loading optional contact page modules:", error);
    }

    const searchInput = document.getElementById("search-input");
    const burgerMenu = document.querySelector("burger-menu");
    const requestsContainer = document.querySelector(".contact-container-friend-requests");
    const friendsContainer = document.querySelector(".contact-container-friends-list");
    const requestsListElement = document.getElementById("incoming-requests-list");
    const friendsListElement = document.getElementById("friend-list");

    if (burgerMenu && typeof burgerMenu.setLoggedIn === "function") {
        burgerMenu.setLoggedIn(loggedIn);
    }

    let allUsersList = [];
    let friendsList = [];
    let friendRequestsSent = [];

    if (!loggedIn) {
        if (requestsContainer) {
            requestsContainer.style.opacity = "0.6";
            requestsContainer.style.pointerEvents = "none";
        }

        if (friendsContainer) {
            friendsContainer.style.opacity = "0.6";
            friendsContainer.style.pointerEvents = "none";
        }

        if (requestsListElement) {
            requestsListElement.innerHTML = "Login required";
        }

        if (friendsListElement) {
            friendsListElement.innerHTML = "Login required";
        }
    } else {
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
    }

    try {
        const data = await getAllUsers();
        allUsersList = data.users || [];
        const myUserId = getMyUserId();
        if (myUserId) {
            allUsersList = allUsersList.filter(user => user.id !== myUserId);
        }
        displayAllUsers(allUsersList, friendsList, friendRequestsSent, loggedIn);
    } catch (error) {
        console.error("Error fetching users:", error);
    }

    searchInput.addEventListener("input", () => {
        const filter = searchInput.value.toLowerCase();
        const userFiltered = allUsersList.filter(user => user.username.toLowerCase().includes(filter));
        displayAllUsers(userFiltered, friendsList, friendRequestsSent, loggedIn);
    });

    if (loggedIn) {
        getFriendRequests().then(requests => {
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
    }

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

        const profileButton = document.createElement("button");
        profileButton.textContent = "View Profile";
        profileButton.addEventListener("click", () => {
            window.location.href = `/pages/profile/profile.html?user=${friend.username}`;
        });

        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("button-container");
        buttonContainer.appendChild(profileButton);
        buttonContainer.appendChild(removeButton);

        friendItem.appendChild(buttonContainer);
        friendsListElement.appendChild(friendItem);
    });
}

const displayAllUsers = (users, friends, sentRequests, loggedIn) => {
    const allUsersList = document.getElementById("user-list");
    allUsersList.innerHTML = "";
    users.forEach((user) => {
        const listItem = document.createElement("div");
        listItem.classList.add("user-item");
        listItem.textContent = user.username;
        const addButton = document.createElement("button");
        if (!loggedIn) {
            addButton.textContent = "Login required";
            addButton.disabled = true;
        } else if (friends.some(friend => friend.username === user.username)) {
            addButton.textContent = "Already Friends";
            addButton.disabled = true;
        } else if (sentRequests.some(request => request.username === user.username)) {
            addButton.textContent = "Request Sent";
            addButton.disabled = true;
        } else {
            addButton.textContent = "Add Friend";
            addButton.addEventListener("click", () => {
                addButton.disabled = true;
                sendFriendRequest(user.username);
            });
        }

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