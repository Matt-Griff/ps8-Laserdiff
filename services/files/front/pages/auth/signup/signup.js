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

    if(!data.username || !data.password) {
        alert("Please fill in both username and password.");
        return;
    }

    if(data.password !== data.confirmPassword) {
        alert("Mots de passe différents !!");
        return;
    }

    const username_regex = /^[a-zA-Z0-9_]+$/;
    if(!username_regex.test(data.username)) {
        alert("Username can only contain letters, numbers, and underscores.");
        return;
    }

    if (data.username.length < 3 || data.username.length > 20) {
        alert("Username must be between 3 and 20 characters long.");
        return;
    }

    if(data.password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }
    
    signUp(data.username, data.password);
    
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
                localStorage.setItem('accessToken', accessToken);
                document.cookie = `refreshToken=${refreshToken}; path=/; SameSite=Lax`;
                window.location.replace('../../home/home.html');
            });           
        } else {
            response.text().then(text => alert(`Erreur lors de l'inscription : ${text}`));
        }
    });
}