import { CONFIG } from "../../../js/config.js";

const signUpForm = document.querySelector("#signup-form");

signUpForm.addEventListener('submit', event => {
    event.preventDefault();

    const formData = new FormData(signUpForm);
    const data = {
        username: formData.get('username'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirm-password')
    };

    if(data.password !== data.confirmPassword) {
        alert("Mots de passe différents !!");
    } else {
        signUp(data.username, data.password);
    }
});

const signUp = (username, password) => {
    const data = {
        username: username,
        password: password
    };

    fetch(`${CONFIG.GATEWAY_URL}/api/auth/signup`, {
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
                const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
                document.cookie = `accessToken=${accessToken}; path=/; SameSite=Lax; Expires=${expires}`;
                document.cookie = `refreshToken=${refreshToken}; path=/; SameSite=Lax; Expires=${expires}`;
                window.location.replace('../../home/home.html');
            });           
        } else {
            response.text().then(text => alert(`Erreur lors de l'inscription : ${text}`));
        }
    });
}