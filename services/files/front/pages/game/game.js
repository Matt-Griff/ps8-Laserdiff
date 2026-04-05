import { isloggedIn } from "../../js/auth/is-logged.js";

document.addEventListener("DOMContentLoaded", async () => {
    const loggedIn = await isloggedIn();
    const burgerMenu = document.querySelector("burger-menu");

    if (burgerMenu) {
        burgerMenu.setLoggedIn(loggedIn);
    }
});
