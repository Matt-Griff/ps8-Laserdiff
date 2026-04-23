import { isloggedIn } from "../../js/auth/is-logged.js";

document.addEventListener("DOMContentLoaded", async () => {
    const loggedIn = await isloggedIn();
    const burgerMenu = document.querySelector("burger-menu");

    if (burgerMenu) {
        burgerMenu.setLoggedIn(loggedIn);
    }

    document.addEventListener('open-chat', () => {
        console.log("Opening chat from game page");
        const chatTab = document.querySelector('.mobile-chat');
        if (chatTab) {
            if (chatTab.style.display === 'flex') {
                chatTab.style.display = 'none';
            } else {
                chatTab.style.display = 'flex';
                chatTab.restore();
                chatTab.setAttribute('show-in-game-tab', 'true');
            }
        }
    });

    document.addEventListener('close-chat', () => {
        console.log("Closing chat from game page");
        const chatTab = document.querySelector('.mobile-chat');
        if (chatTab) {
            chatTab.style.display = 'none';
            chatTab.removeAttribute('show-in-game-tab');
        }
    });
});
