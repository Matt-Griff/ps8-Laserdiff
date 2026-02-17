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

const login = (username, password) => {
    
    const data = {
        username: username,
        password: password
    };

    fetch(`${CONFIG.GATEWAY_URL}/api/status`, {
        method: 'GET',
        headers : {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if(response.ok) {
            console.log("Gateway is up, sending login request...");
        } else {
            alert("Gateway is down, please try again later.");
            throw new Error("Gateway is down");
        }
    });

    fetch(`${CONFIG.GATEWAY_URL}/api/auth/login`, {
        method: 'POST',
        headers : {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if(response.ok) {
            response.json().then(json => {
                const accessToken = json.accessToken;
                const refreshToken = json.refreshToken;
                localStorage.setItem('accessToken', accessToken);
                document.cookie = `refreshToken=${refreshToken}; path=/; SameSite=Lax`;
                window.location.replace('../../home/home.html');
            });
        } else {
            response.text().then(text => alert(text));
        }
    });
}