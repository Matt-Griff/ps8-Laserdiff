import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);
const dbName = "chatDB";

let dbInstance = null;
let connectPromise = null;

export const connectDB = async () => {
    // 1. If we already have the DB, return it immediately
    if (dbInstance) return dbInstance;
    
    // 2. If a connection is already in progress, wait for it
    if (!connectPromise) {
        connectPromise = client.connect().then(c => {
            console.log("CHAT: Connected to MongoDB");
            const db = c.db(dbName);
            
            // Create a compound index for lightning-fast queries
            db.collection("messages").createIndex({ conversationKey: 1, timestamp: 1 });
            
            return db;
        }).catch(err => {
            console.error("CHAT: MongoDB Connection Error:", err);
            connectPromise = null;
            throw err;
        });
    }
    
    dbInstance = await connectPromise;
    return dbInstance;
};

export const saveFriendMessage = async (fromId, toId, authorName, text) => {
    const db = await connectDB();
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
    const db = await connectDB();
    const conversationKey = [user1Id, user2Id].sort().join("_");
    
    return db.collection("messages")
        .find({ conversationKey })
        .sort({ timestamp: 1 })
        .limit(limit)
        .toArray();
};