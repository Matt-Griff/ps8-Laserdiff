const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");
const { create_access_token, create_refresh_token } = require("../tokens/tokens");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);
const dbName = "authenticationDB";

let connected = false;

const connectDB = async () => {
    if(!connected) {
        await client.connect();
        connected = true;
        console.log("Connected !!");
    }
}

const loginUser = async (username, password) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("users");
    const user = await collection.findOne({ username });
    
    const passwordMatch = user && await bcrypt.compare(password, user.password);
    const accessToken = create_access_token({ _id: user._id, username: user.username });
    const refreshToken = create_refresh_token({ _id: user._id, username: user.username });

    storeRefreshToken(user._id, refreshToken);

    if(passwordMatch) {
        return { user: { _id: user._id, username: user.username }, accessToken, refreshToken };
    }
    return null;
}

const registerUser = async (username, password) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("users");
    const existingUser = await collection .findOne({ username });

    if(existingUser) {
        throw new Error("Username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await collection.insertOne({ username, password: hashedPassword });
    const accessToken = create_access_token({ _id: result.insertedId, username });
    const refreshToken = create_refresh_token({ _id: result.insertedId, username });

    storeRefreshToken(result.insertedId, refreshToken);

    return { user: { _id: result.insertedId, username }, accessToken, refreshToken };
}

const storeRefreshToken = async (userId, refreshToken) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("refreshTokens");
    await collection.updateOne(
        { userId },
        { $set: { refreshToken } },
        { upsert: true }
    );
}

const refreshTokenExists = async (userId, refreshToken) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("refreshTokens");
    const tokenDoc = await collection.findOne({ userId, refreshToken });
    return !!tokenDoc;
}

module.exports = { loginUser, registerUser, refreshTokenExists };