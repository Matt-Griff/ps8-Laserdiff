import { CONFIG } from "../../js/config.js";
import { getMyJWT } from "../../js/controllers/user-controller.js";

document.addEventListener("DOMContentLoaded", () => {
    fetch(`${CONFIG.GATEWAY_URL}/api/public/users`)
        .then((response) => response.json())
        .then((data) => {
            console.log("Public data:", data);
            const userList = document.getElementById("user-list");
            data.users.forEach((user) => {
                const listItem = document.createElement("li");
                listItem.textContent = user.username;

                const friendButton = document.createElement("button");
                friendButton.textContent = "Add Friend";
                friendButton.addEventListener("click", () => {
                    // friendButton.disabled = true;
                    fetch(`${CONFIG.GATEWAY_URL}/api/friends/requests/ask`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${getMyJWT()}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ friendId: user.id })
                    })
                        .then((response) => {
                            if (response.ok) {
                                alert("Friend request sent!");
                            } else {
                                alert("Failed to send friend request.");
                            }
                        })
                        .catch((error) => {
                            console.error("Error sending friend request:", error);
                        });
                });

                listItem.appendChild(friendButton);
                userList.appendChild(listItem);
            });
        })
        .catch((error) => {
            console.error("Error fetching public data:", error);
        });
});