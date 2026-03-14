import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);
const dbName = "chatDB";

let connected = false;

export const connectDB = async () => {
    if (!connected) {
        await client.connect();
        connected = true;
        console.log("CHAT: Connected to MongoDB");
    }
};

export const saveFriendMessage = async (fromId, toId, authorName, text) => {
    await connectDB();
    const db = client.db(dbName);
    const conversationKey = [fromId, toId].sort().join("_");
    await db.collection("messages").insertOne({
        conversationKey,
        fromId,
        toId,
        authorName,
        text,
        timestamp: new Date()
    });
};

export const getFriendMessages = async (user1Id, user2Id, limit = 50) => {
    await connectDB();
    const db = client.db(dbName);
    const conversationKey = [user1Id, user2Id].sort().join("_");
    return db.collection("messages")
        .find({ conversationKey })
        .sort({ timestamp: 1 })
        .limit(limit)
        .toArray();
};
