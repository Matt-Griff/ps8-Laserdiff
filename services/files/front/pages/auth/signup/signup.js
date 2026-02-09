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

    fetch(`${CONFIG.AUTH_SERVICE_URL}/api/auth/signup`, {
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
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
                window.location.href = '../../home/home.html';
            });           
        } else {
            response.text().then(text => alert(`Erreur lors de l'inscription : ${text}`));
        }
    });
}