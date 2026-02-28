const jwt = require("jsonwebtoken");

const create_access_token = (user) => {
    const jwt_key = process.env.JWT_ACCESS_TOKEN_KEY || "default-jwt-key";
    const payload = {
        id: user._id,
        username: user.username,
        iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, jwt_key, { expiresIn: '30m' });
    return token;
}

const create_refresh_token = (user) => {
    const jwt_key = process.env.JWT_REFRESH_TOKEN_KEY || "default-refresh-jwt-key";
    const payload = {
        id: user._id,
        username: user.username,
        iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, jwt_key, { expiresIn: '7d' });
    return token;
}

const verify_access_token = (token) => {
    const jwt_key = process.env.JWT_ACCESS_TOKEN_KEY || "default-jwt-key";
    try {
        const decoded = jwt.verify(token, jwt_key);
        return decoded;
    } catch (error) {
        return null;
    }
};

const verify_refresh_token = (token) => {
    const jwt_key = process.env.JWT_REFRESH_TOKEN_KEY || "default-refresh-jwt-key";
    try {
        const decoded = jwt.verify(token, jwt_key);
        return decoded;
    } catch (error) {
        return null;
    }
};

const get_user_from_token = (token) => {
    if (!token) return null;
    token = token.replace("Bearer ", "");
    const decoded = verify_access_token(token);
    if (decoded) {
        return {
            id: decoded.id,
            username: decoded.username
        };
    }
    return null;
}

const create_access_token_from_refresh_token = (refreshToken) => {
    const decoded = verify_refresh_token(refreshToken);
    if (!decoded) return null;
    return create_access_token({ _id: decoded.id, username: decoded.username });
}

module.exports = {
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    verify_access_token,
    get_user_from_token,
    create_access_token_from_refresh_token
}
