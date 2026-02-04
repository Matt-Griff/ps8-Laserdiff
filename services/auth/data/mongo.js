const { MongoClient } = require("mongodb");

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

const getUser = async (username, password) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("users");
    const user = await collection.findOne({ username, password });
    return user;
}

const registerUser = async (username, password) => {
    await connectDB();
    const db = client.db(dbName);
    const collection = db.collection("users");
    const existingUser = await getUser(username, password);

    if(existingUser) {
        throw new Error("User already exists");
    } else {
        const result = await collection.insertOne({ username, password });
        return result;
    };
}
            

module.exports = { getUser, registerUser };