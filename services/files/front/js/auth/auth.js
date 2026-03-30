import { CONFIG } from "../config.js";

const getRawCookie = (name) => {
    const match = document.cookie.split(';').find(c => c.trim().startsWith(`${name}=`));
    return match ? match.trim().slice(name.length + 1) : null;
};

const clearCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

const checkLoginStatus = async () => {
    const accessToken = getRawCookie('accessToken');
    if (!accessToken) return false;

    try {
        const res = await fetch(`${CONFIG.GATEWAY_URL}/api/auth/is-logged-in`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!res.ok) clearCookie('accessToken');
        return res.ok;
    } catch (error) {
        console.error(`Error checking login status: ${error.message}`);
        return false;
    }
};

const tryRefreshToken = async () => {
    const refreshToken = getRawCookie('refreshToken');
    if (!refreshToken) return false;

    try {
        const refreshRes = await fetch(`${CONFIG.GATEWAY_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        if (refreshRes.ok) {
            const json = await refreshRes.json();
            const newAccessToken = json.newAccessToken;
            const userId = json.userId;
            const username = json.username;
            const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
            document.cookie = `accessToken=${newAccessToken}; path=/; SameSite=Lax; Expires=${expires}`;
            document.cookie = `userId=${userId}; path=/; SameSite=Lax; Expires=${expires}`;
            document.cookie = `username=${username}; path=/; SameSite=Lax; Expires=${expires}`;
            return true;
        } else {
            clearCookie('refreshToken');
            return false;
        }
    } catch (error) {
        console.error(`Error refreshing token: ${error.message}`);
        return false;
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    const isAuthPage = path.includes('/pages/auth/login/') || path.includes('/pages/auth/signup/');
    if (!isAuthPage) {
        return;
    }

    const loggedIn = await checkLoginStatus();
    if (loggedIn) {
        window.location.href = "/pages/home/home.html";
        return;
    }

    const refreshSuccess = await tryRefreshToken();
    if (refreshSuccess) {
        window.location.href = "/pages/home/home.html";
    } else {
        console.log("User is not logged in, staying on login page");
    }
});

export { getRawCookie, clearCookie, checkLoginStatus, tryRefreshToken };