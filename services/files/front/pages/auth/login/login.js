import { CONFIG } from "../../../js/config.js";

const loginForm = document.querySelector('#login-form');

loginForm.addEventListener('submit', event => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    login(data.username, data.password);
});

const login = async (username, password) => {

    const data = {
        username: username,
        password: password
    };

    waitingForLoading();
    await fetch(`${CONFIG.GATEWAY_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (response.ok) {
                response.json().then(json => {
                    const accessToken = json.accessToken;
                    const refreshToken = json.refreshToken;
                    const userId = json.userId;
                    const username = json.username;
                    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
                    document.cookie = `accessToken=${accessToken}; path=/; SameSite=Lax; Expires=${expires}`;
                    document.cookie = `refreshToken=${refreshToken}; path=/; SameSite=Lax; Expires=${expires}`;
                    document.cookie = `userId=${userId}; path=/; SameSite=Lax; Expires=${expires}`;
                    document.cookie = `username=${username}; path=/; SameSite=Lax; Expires=${expires}`;
                    window.location.replace('../../home/home.html');
                });
            } else {
                response.text().then(text => alert(text));
            }
        });
}

const waitingForLoading = () => {
    startThrobber();
}

const startThrobber = () => {
    const overlay = document.createElement("div");
    overlay.className = "global-throbber-overlay";
    overlay.id = "global-throbber-overlay";

    const throbber = document.createElement("global-throbber");
    overlay.appendChild(throbber);
    document.body.append(overlay);
}