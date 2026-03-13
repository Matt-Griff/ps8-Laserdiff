import { CONFIG } from "../config.js";
import { getMyJWT } from "../controllers/user-controller.js";

const getAllUsers = async () => {
    try {
        const response = await fetch(`${CONFIG.GATEWAY_URL}/api/public/users`);
        return response.json();
    } catch (error) {
        console.error("Error fetching public data:", error);
        throw error;
    }
}

const sendFriendRequest = async (friendname) => {
    try {
        const response = await fetch(`${CONFIG.GATEWAY_URL}/api/friends/requests/ask`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${getMyJWT()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ friendname })
        });
        if (!response.ok) {
            throw new Error("Failed to send friend request");
        }
        return response.json();
    } catch (error) {
        console.error("Error sending friend request:", error);
        throw error;
    }
}

const getFriendRequests = async () => {
    try {
        const response = await fetch(`${CONFIG.GATEWAY_URL}/api/friends/requests`, {
            headers: {
                "Authorization": `Bearer ${getMyJWT()}`
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch friend requests: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error("Error fetching friend requests:", error);
        throw error;
    }
}

const getFriendsList = async () => {
    try {
        const response = await fetch(`${CONFIG.GATEWAY_URL}/api/friends`, {
            headers: {
                "Authorization": `Bearer ${getMyJWT()}`
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch friends list: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error("Error fetching friends list:", error);
        throw error;
    }
}

const revokeFriendship = async (friendname) => {
    try {
        const response = await fetch(`${CONFIG.GATEWAY_URL}/api/friends/`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${getMyJWT()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ friendname })
        });
        if (!response.ok) {
            throw new Error(`Failed to revoke friendship: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error("Error revoking friendship:", error);
        throw error;
    }
}

const acceptFriendRequest = async (friendname) => {
    try {
        const response = await fetch(`${CONFIG.GATEWAY_URL}/api/friends/requests/accept`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${getMyJWT()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ friendname })
        });
        if (!response.ok) {
            throw new Error(`Failed to accept friend request: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error("Error accepting friend request:", error);
        throw error;
    }
}

export { getAllUsers, sendFriendRequest, getFriendRequests, getFriendsList, revokeFriendship, acceptFriendRequest };