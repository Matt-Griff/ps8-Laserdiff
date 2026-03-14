import { getAllUsers, sendFriendRequest, getFriendsList, getFriendRequests, revokeFriendship, acceptFriendRequest } from "../../js/friends/friend-command.js";

document.addEventListener("DOMContentLoaded", async () => {
    const searchInput = document.getElementById("search-input");
    let allUsersList = [];

    try {
        const data = await getAllUsers();
        allUsersList = data.users || [];
        displayAllUsers(allUsersList);
    } catch (error) {
        console.error("Error fetching users:", error);
    }

    searchInput.addEventListener("input", () => {
        const filter = searchInput.value.toLowerCase();
        const userFiltered = allUsersList.filter(user => user.username.toLowerCase().includes(filter));
        displayAllUsers(userFiltered);
    });
    
});

const displayAllUsers = (users) => {
    const allUsersList = document.getElementById("user-list");
    allUsersList.innerHTML = "";
    users.forEach((user) => {
        const listItem = document.createElement("li");
        listItem.textContent = user.username;
        const addButton = document.createElement("button");
        addButton.textContent = "Add Friend";
        addButton.addEventListener("click", () => {
            addButton.disabled = true;
            sendFriendRequest(user.username);
        });
        listItem.appendChild(addButton);
        allUsersList.appendChild(listItem);
    });
}