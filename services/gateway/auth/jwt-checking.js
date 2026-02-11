const jwt = require("jsonwebtoken");
const JWT_ACCESS_TOKEN_KEY = process.env.JWT_ACCESS_TOKEN_KEY || "your_secret_key_here";
console.log(`JWT_ACCESS_TOKEN_KEY: ${JWT_ACCESS_TOKEN_KEY}`);

const checkToken = (req) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return false;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return false;
    }

    try {
        jwt.verify(token, JWT_ACCESS_TOKEN_KEY);
        return true;
    } catch (err) {
        console.log(`JWT verification failed: ${err.message}`);
        return false;
    }
}

module.exports = { checkToken };