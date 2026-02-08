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

    if(passwordMatch) {
        return { user: { _id: user._id, username: user.username }, accessToken };
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
    return { user: { _id: result.insertedId, username }, accessToken };
}

module.exports = { loginUser, registerUser };