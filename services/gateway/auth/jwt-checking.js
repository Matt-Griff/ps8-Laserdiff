const jwt = require("jsonwebtoken");
const JWT_ACCESS_TOKEN_KEY = process.env.JWT_ACCESS_TOKEN_KEY || "your_secret_key_here";
console.log(`JWT_ACCESS_TOKEN_KEY: ${JWT_ACCESS_TOKEN_KEY}`);

const checkToken = (req) => {
    let token = null;

    // API calls — Bearer header
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    }

    // Page navigation — Cookie
    if (!token && req.headers['cookie']) {
        req.headers['cookie'].split(';').forEach(c => {
            const [k, v] = c.trim().split('=');
            if (k === 'accessToken') token = decodeURIComponent(v);
        });
    }

    if (!token) return false;

    try {
        jwt.verify(token, JWT_ACCESS_TOKEN_KEY);
        return true;
    } catch (err) {
        return false;
    }
}

module.exports = { checkToken };