import { CONFIG } from "../../js/config.js";
import { getMyJWT } from "../../js/controllers/user-controller.js";



document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('userId')) {
        if (urlParams.get('userId') === "me") {
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
                })
                .catch(error => {
                    console.error(`Error fetching user data: ${error.message}`);
                });
        } else {
            // Handle the case where the user is viewing another user's profile
            const userId = urlParams.get('userId');
            fetch(`${CONFIG.GATEWAY_URL}/api/public/user/${userId}`)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch user data');
                    return res.json();
                })
                .then(userData => {
                    // Display user data on the profile page
                    document.getElementById('username').textContent = userData.username;
                })
                .catch(error => {
                    console.error(`Error fetching user data: ${error.message}`);
                });
        }
    } else {
        console.warn("No userId found in URL parameters.");
    }
});