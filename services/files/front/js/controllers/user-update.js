import { getMyJWT } from "./user-controller.js";
import { CONFIG } from "../config.js";

const updatePP = (url) => {
    const jwt = getMyJWT();
    return fetch(`${CONFIG.GATEWAY_URL}/api/user`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({ pp: url })
    }).then(response => {
        if (!response.ok) {
            throw new Error('Failed to update profile picture');
        }
    }).catch(error => {
        console.error('Error updating profile picture:', error);
        throw error;
    });
}

export { updatePP };