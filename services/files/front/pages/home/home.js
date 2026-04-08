import { isloggedIn } from "../../js/auth/is-logged.js";

const loggedIn = await isloggedIn();

await Promise.all([
    import("../../components/burger-menu/burger-menu.js"),
    import("../../components/friends-list/friends-list.js"),
    import("../../components/profile-icon/profile-icon.js"),
]);

const burgerMenu = document.getElementById("burger-menu");
if (burgerMenu) {
    burgerMenu.setLoggedIn(loggedIn);
}


const profileIcon = document.getElementById("profile-icon");
if (profileIcon) {
    profileIcon.setLoggedIn(loggedIn);
}

const friendsList = document.getElementById("friends-list");
if (friendsList) {
    friendsList.setLoggedIn(loggedIn);
}

const gameModeLinks = document.querySelectorAll(".button-container a");
const protectedGameModeLinks = Array.from(gameModeLinks).filter((link) => {
    const href = link.getAttribute("href") || "";
    return !href.includes("mode=1v1-local");
});

if (!loggedIn) {
    protectedGameModeLinks.forEach((link) => {
        const button = link.querySelector("button.game-button");

        link.classList.add("game-link-disabled");
        link.setAttribute("aria-disabled", "true");
        link.dataset.originalHref = link.getAttribute("href") || "";
        link.removeAttribute("href");

        link.addEventListener("click", (event) => {
            event.preventDefault();
        });

        if (button) {
            button.disabled = true;
        }
    });
}

if (!loggedIn) {
    console.log("User is not logged in");
} else {
    console.log("User is logged in");
    await import("../../js/socket/socket.io.js");
    await import("../../js/socket/game-active.js");
    await import("../../js/socket/notification-duel-receiver.js");
    await import("../../components/chat/chat.js");
}