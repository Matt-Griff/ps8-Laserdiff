const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);
const dbName = "leaderboardDB";
const authDbName = "authenticationDB";

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
    const db = client.db(authDbName);
    const collection = db.collection("users");
    const leaderboard = await collection.find().sort({ elo: -1 }).toArray();
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

const getLeague = async (username) => {
    await connectDB();
    const db = client.db(authDbName);
    const collection = db.collection("users");
    const user = await collection.findOne({ username: username});

    if(user) {
        return user.league || "Bronze";
    }

    return "Bronze";
}

const updateLeague = async (username, league) => {
    await connectDB();
    const db = client.db(authDbName);
    const collection = db.collection("users");
    await collection.updateOne(
        { username: username },
        { $set: { league: league } }
    );
}


module.exports =  { getLeaderboard, updateLeaderboard, getLeague, updateLeague };