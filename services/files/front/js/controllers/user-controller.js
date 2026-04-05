import { CONFIG } from "../config.js";

const getRawCookie = (name) => {
    const match = document.cookie.split(';').find(c => c.trim().startsWith(`${name}=`));
    return match ? match.trim().slice(name.length + 1) : null;
};

const getMyJWT = () => {
    const accessToken = getRawCookie('accessToken');
    return accessToken ? accessToken : null;
};

const getMyUserId = () => {
    const userId = getRawCookie('userId');
    return userId ? userId : null;
}

const getMyUsername = () => {
    const username = getRawCookie('username');
    return username ? username : null;
}

const changeStatus = async (status) => {
    const jwt = getMyJWT();
    const username = getMyUsername();

    if (!jwt || !username) {
        return;
    }

    await fetch(`${CONFIG.GATEWAY_URL}/api/user/${username}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({ status })
    }).then(response => {
        if (!response.ok) {
            console.error("Failed to change status to " + status);
            console.error(response.status + ": " + response.statusText);
        }
    }).catch(error => {
        console.error("Error changing status to " + status, error);
    });
}


export { getMyJWT, getMyUserId, getMyUsername, changeStatus }; 