const { MongoClient } = require("mongodb");

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

const getUser = async (username) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("users");
    const user = await collection.findOne({ username: username });
    return user;
}

const updateUser = async (username, updateData) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("users");
    const result = await collection.updateOne({ username: username }, { $set: updateData });
    return result;
}

const getUserStatus = async (username) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("status");
    const status = await collection.findOne({ username: username });
    if(!status) {
        return null;
    }
    return status.status;
}

const updateUserStatus = async (username, status) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("status");
    const result = await collection.updateOne({ username: username }, { $set: { status: status } }, { upsert: true });
    return result;
}

const updateUserStatusFromId = async (userId, status) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("status");
    const result = await collection.updateOne({ _id: userId }, { $set: { status: status } }, { upsert: true });
    return result;
}

const getElo = async (username) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("users");
    const user = await collection.findOne({ username: username }, { projection: { elo: 1 } });
    return user?.elo ?? null;
}

const updateElo = async (username, newElo) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("users");
    const res = await collection.updateOne({username: username}, { $set: { elo: newElo }});
    return res;
}

module.exports = {
    getUser,
    updateUser,
    getUserStatus,
    updateUserStatus,
    updateUserStatusFromId,
    getElo,
    updateElo
};