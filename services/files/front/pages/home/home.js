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

if (!loggedIn) {
    console.log("User is not logged in");
} else {
    console.log("User is logged in");
    await import("../../js/socket/socket.io.js");
    await import("../../js/socket/game-active.js");
}