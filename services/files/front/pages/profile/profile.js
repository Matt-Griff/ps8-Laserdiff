import { CONFIG } from "../../js/config.js";
import { getMyJWT } from "../../js/controllers/user-controller.js";

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('user')) {
        if (urlParams.get('user') === "me") {
            document.querySelector('.edit-container').hidden = false;
            // Handle the case where the user is viewing their own profile
            fetch(`${CONFIG.GATEWAY_URL}/api/user/me`, {
                headers: { 'Authorization': `Bearer ${getMyJWT()}` }
            })
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch user data');
                    return res.json();
                })
                .then(userData => {
                    // Display user data on the profile page
                    document.getElementById('username').textContent = userData.username;
                    document.getElementById('profile-picture').src = userData.pp;
                })
                .catch(error => {
                    console.error(`Error fetching user data: ${error.message}`);
                });
        } else {
            // Handle the case where the user is viewing another user's profile
            const userName = urlParams.get('user');
            fetch(`${CONFIG.GATEWAY_URL}/api/public/user/${userName}`)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch user data');
                    return res.json();
                })
                .then(userData => {
                    // Display user data on the profile page
                    document.getElementById('username').textContent = userData.username;
                    document.getElementById('profile-picture').src = userData.pp;
                })
                .catch(error => {
                    console.error(`Error fetching user data: ${error.message}`);
                });
        }
    } else {
        console.warn("No username found in URL parameters.");
    }
});