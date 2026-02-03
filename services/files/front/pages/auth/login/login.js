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

    fetch(`${CONFIG.AUTH_SERVICE_URL}/api/auth/login`, {
        method: 'POST',
        headers : {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if(response.ok) {
            window.location.href = '../../home/home.html';
        } else {
            response.text().then(text => alert(text));
        }
    });
}