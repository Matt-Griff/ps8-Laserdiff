const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);
const dbName = "leaderboardDB";

let connected = false;

const connectDB = async () => {
    if(!connected) {
        await client.connect();
        connected = true;
        console.log("Connected !!");
    }
}

const getLeaderboard = async () => {
    await connectDB();
    const db = client.db(dbName);
    const leaderboardCollection = db.collection("leaderboard");
    const leaderboard = await leaderboardCollection.find().sort({ elo: -1 }).toArray();
    return leaderboard;
}

const updateLeaderboard = async (username, elo, league) => {
    await connectDB();
    const db = client.db(dbName);
    const leaderboardCollection = db.collection("leaderboard");
    await leaderboardCollection.updateOne(
        { username: username },
        { $set: { elo: elo, league: league } },
        { upsert: true }
    );
}


export { getLeaderboard, updateLeaderboard };