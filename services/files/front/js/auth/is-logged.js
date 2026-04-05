import { checkLoginStatus, tryRefreshToken } from "./auth.js";

const isloggedIn = async () => {
    const loggedIn = await checkLoginStatus();
    if (loggedIn) {
        return true;
    }

    const refreshSuccess = await tryRefreshToken();
    if (refreshSuccess) {
        return true;
    } else {
        return false;
    }
};

export { isloggedIn };