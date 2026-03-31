const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const { create_access_token, create_refresh_token } = require("../tokens/tokens");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);
const dbName = "authenticationDB";

let connected = false;

const connectDB = async () => {
    if (!connected) {
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

    if (!user) return null;

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return null;

    const accessToken = create_access_token({ _id: user._id, username: user.username });
    const refreshToken = create_refresh_token({ _id: user._id, username: user.username });

    await storeRefreshToken(user._id, refreshToken);
    await storeStatus(user.username, "online");

    return { user: { _id: user._id, username: user.username }, accessToken, refreshToken };
}

const registerUser = async (username, password) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("users");
    const existingUser = await collection.findOne({ username });

    if (existingUser) {
        throw new Error("Username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await collection.insertOne({ username, password: hashedPassword, elo: 800 });
    const accessToken = create_access_token({ _id: result.insertedId, username });
    const refreshToken = create_refresh_token({ _id: result.insertedId, username });

    await storeRefreshToken(result.insertedId, refreshToken);
    await storeStatus(username, "online");

    return { user: { _id: result.insertedId, username, pp: null }, accessToken, refreshToken };
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

const storeStatus = async (username, status) => {
    await connectDB();

    const db = client.db(dbName);
    const collection = db.collection("status");
    await collection.updateOne(
        { username },
        { $set: { status } },
        { upsert: true }
    );
}

const refreshTokenExists = async (userId, refreshToken) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("refreshTokens");
    const objectId = new ObjectId(userId);
    const tokenDoc = await collection.findOne({ userId: objectId, refreshToken });
    return !!tokenDoc;
}

const get_user_from_id = async (userId) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("users");
    const objectId = new ObjectId(userId);
    const user = await collection.findOne({ _id: objectId });
    if (user) {
        if(!user.pp) {
            user.pp = "https://static.bigbrain.gg/assets/lol/riot_static/16.4.1/img/profileicon/29.png";
        }
        return { id: user._id, username: user.username, pp: user.pp, elo: user.elo };
    }
    return null;
}

const get_users_list = async () => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("users");
    const users = await collection.find({}, { projection: { _id: 1, username: 1 } }).toArray();
    return users.map(user => ({ id: user._id, username: user.username }));
}

const get_user_from_username = async (username) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("users");
    const user = await collection.findOne({ username });
    if (user) {
        let { _id, username, pp, elo } = user;
        if (!pp) {
            pp = "https://static.bigbrain.gg/assets/lol/riot_static/16.4.1/img/profileicon/29.png";
        }
        return { id: _id, username, pp, elo };
    }
    return null;
}

module.exports = { loginUser, registerUser, refreshTokenExists, get_user_from_id, get_users_list, get_user_from_username };