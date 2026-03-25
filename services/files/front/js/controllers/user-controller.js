import { CONFIG } from "../config.js";

const getRawCookie = (name) => {
    const match = document.cookie.split(';').find(c => c.trim().startsWith(`${name}=`));
    return match ? match.trim().slice(name.length + 1) : null;
};

const getMyJWT = () => {
    const accessToken = getRawCookie('accessToken');
    return accessToken ? accessToken : null;
};

const getMyUserId = () => {
    const userId = getRawCookie('userId');
    return userId ? userId : null;
}

const getMyUsername = () => {
    const username = getRawCookie('username');
    return username ? username : null;
}

const getEloFrom = async (username) => {
    return await fetch(`${CONFIG.GATEWAY_URL}/api/user/${username}/elo`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${getMyJWT()}`
        }
    }).then(res => {
        if(res.ok) {
            return res.json().then(json => json.elo);
        } else {
            console.error("Failed to fetch elo for user " + username);
            console.error(res.status + ": " + res.statusText);
            return null;
        }
    }).catch(error => {
        console.error("Error fetching elo for user " + username, error);
        return null;
    });
}

const getMyElo = async () => {
    return await getEloFrom(getMyUsername());
}

const changeStatus = async(status) => {
    await fetch(`${CONFIG.GATEWAY_URL}/api/user/${getMyUsername()}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getMyJWT()}`
        },
        body: JSON.stringify({ status })
    }).then(response => {
        if (!response.ok) {
            console.error("Failed to change status to " + status);
            console.error(response.status + ": " + response.statusText);
        }    
    }).catch(error => {
        console.error("Error changing status to " + status, error);
    });
}

const computeNewElo = async (opponentUsername, win) => {

    const K = 30;
    
    const v = (D) => {
        return 1 / (1 + Math.pow(10, -D/400));
    }

    const myElo = await getMyElo();
    const opponentElo = await getEloFrom(opponentUsername);
    
    if (!myElo || !opponentElo) {
        console.error("Cannot compute new elo: missing elo data");
        return null;
    }

    const D = myElo - opponentElo;
    const vD = v(D);
    const newElo = Math.round(myElo + K * (win - vD));

    await updateElo(newElo);
}

const updateElo = async (newElo) => {
    await fetch(`${CONFIG.GATEWAY_URL}/api/user/${getMyUsername()}/elo`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getMyJWT()}`
        },
        body: JSON.stringify({ elo: newElo })
    }).then(response => {
        if (!response.ok) {
            console.error("Failed to update elo to " + newElo);
            console.error(response.status + ": " + response.statusText);
        }
    }).catch(error => {
        console.error("Error updating elo to " + newElo, error);
    });
}

export { getMyJWT, getMyUserId, getMyUsername, changeStatus, computeNewElo }; 