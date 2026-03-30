import { isloggedIn } from "../../js/auth/is-logged.js";

const loggedIn = await isloggedIn();

if (!loggedIn) {
    window.location.replace("/pages/auth/login/login.html");
} else {
    console.log("User is logged in");

    await import("../../js/socket/socket.io.js");

    await Promise.all([
        import("../../components/burger-menu/burger-menu.js"),
        import("../../components/friends-list/friends-list.js"),
        import("../../components/profile-icon/profile-icon.js"),
        import("../../js/socket/game-active.js"),
    ]);
}