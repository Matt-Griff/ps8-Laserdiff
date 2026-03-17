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
        const response = await fetch(`${CONFIG.GATEWAY_URL}/api/friends/requests/`, {
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

const answerFriendRequest = async (friendname, isAccepted) => {
    try {
        const response = await fetch(`${CONFIG.GATEWAY_URL}/api/friends/requests/`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${getMyJWT()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ friendname, result: isAccepted ? "accept" : "refuse" })
        });
        if (!response.ok) {
            throw new Error(`Failed to answer friend request: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error("Error answering friend request:", error);
        throw error;
    }
}


const getFriendRequestsSent = async () => {
    try {
        const response = await fetch(`${CONFIG.GATEWAY_URL}/api/friends/requests/sent`, {
            headers: {
                "Authorization": `Bearer ${getMyJWT()}`
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch sent friend requests: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error("Error fetching sent friend requests:", error);
        throw error;
    }
}

export { getAllUsers, sendFriendRequest, getFriendRequests, getFriendsList, revokeFriendship, answerFriendRequest, getFriendRequestsSent     };