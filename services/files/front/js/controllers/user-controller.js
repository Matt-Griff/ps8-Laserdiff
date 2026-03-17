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

export { getMyJWT, getMyUserId }; 