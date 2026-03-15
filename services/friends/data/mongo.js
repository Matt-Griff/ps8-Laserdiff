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

const askToBeFriend = async (username, friendname) => {
    await connectDB();
    const db = client.db(dbName);
    const friendRequestsCollection = db.collection("friend_requests");
    // Add friendname to user's friend requests list
    await friendRequestsCollection.updateOne(
        { username: username },
        { $addToSet: { sent_requests: friendname } },
        { upsert: true }
    );
    // Add username to friend's friend requests list
    await friendRequestsCollection.updateOne(
        { username: friendname },
        { $addToSet: { received_requests: username } },
        { upsert: true });
}

const getFriendRequestsReceived = async (username) => {
    await connectDB();
    const db = client.db(dbName);
    const friendRequestsCollection = db.collection("friend_requests");
    const user = await friendRequestsCollection.findOne({ username: username });
    if (!user) {
        return [];
    }
    const receivedRequestIds = user.received_requests || [];
    const friendRequests = await friendRequestsCollection.find({ username: { $in: receivedRequestIds } }).toArray();
    return friendRequests.map(request => ({ username: request.username }));
}

const alreadySentRequest = async (username, friendname) => {
    await connectDB();
    const db = client.db(dbName);
    const friendRequestsCollection = db.collection("friend_requests");
    const user = await friendRequestsCollection.findOne({ username: username });

    if (!user) {
        throw new Error("User not found");
    }
    const sentRequests = user.sent_requests || [];
    return sentRequests.some(name => name === friendname);
}

const acceptFriendRequest = async (username, friendname) => {
    await connectDB();
    const db = client.db(dbName);
    const requestsCollection = db.collection("friend_requests");
    const friendsCollection = db.collection("friends");

    // Remove username from friend's sent requests list (friend sent the request)
    const result1 = await requestsCollection.updateOne(
        { username: friendname },
        { $pull: { sent_requests: username } }
    );

    // Remove friendname from user's received requests list (user received the request)
    const result2 = await requestsCollection.updateOne(
        { username: username },
        { $pull: { received_requests: friendname } }
    );

    if (result1.modifiedCount === 0 || result2.modifiedCount === 0) {
        throw new Error("Friend request not found");
    }

    // Add friendname to user's friends list
    await friendsCollection.updateOne(
        { username: username },
        { $addToSet: { friends: friendname } },
        { upsert: true }
    );

    // Add username to friend's friends list
    await friendsCollection.updateOne(
        { username: friendname },
        { $addToSet: { friends: username } },
        { upsert: true }
    );
}

const getFriends = async (username) => {
    await connectDB();
    const db = client.db(dbName);
    const friendsCollection = db.collection("friends");

    const user = await friendsCollection.findOne({ username: username });
    if (!user) {
        return [];
    }
    const friendnames = user.friends || [];

    const friends = await friendsCollection.find({ username: { $in: friendnames } }).toArray();
    return friends.map(friend => ({ username: friend.username }));
}

const removeFriend = async (username, friendname) => {
    await connectDB();
    const db = client.db(dbName);
    const friendsCollection = db.collection("friends");
    // Remove friendname from user's friends list
    await friendsCollection.updateOne(
        { username: username },
        { $pull: { friends: friendname } }
    );

    // Remove username from friend's friends list
    await friendsCollection.updateOne(
        { username: friendname },
        { $pull: { friends: username } }
    );
}

const areFriend = async (username, friendname) => {
    await connectDB();
    const db = client.db(dbName);
    const friendsCollection = db.collection("friends");

    const user = await friendsCollection.findOne({ username: username });
    if (!user) {
        throw new Error("User not found");
    }
    const friendnames = user.friends || [];
    return friendnames.some(name => name === friendname);
}

const getIdByUserName = async (username) => {
    await connectDB();
    const db = client.db(dbName);
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ username: username });
    if (!user) {
        throw new Error("User not found");
    }
    return user._id.toString();
};

const refuseFriendRequest = async (username, friendname) => {
    await connectDB();
    const db = client.db(dbName);
    const requestsCollection = db.collection("friend_requests");
    // Remove username from friend's sent requests list (friend sent the request)
    const result1 = await requestsCollection.updateOne(
        { username: friendname },
        { $pull: { sent_requests: username } }
    );

    // Remove friendname from user's received requests list (user received the request)
    const result2 = await requestsCollection.updateOne(
        { username: username },
        { $pull: { received_requests: friendname } }
    );

    if (result1.modifiedCount === 0 || result2.modifiedCount === 0) {
        throw new Error("Friend request not found");
    }
}

const getFriendRequestsSent = async (username) => {
    console.log("Fetching sent friend requests for user:", username);
    await connectDB();
    const db = client.db(dbName);
    const friendRequestsCollection = db.collection("friend_requests");
    const user = await friendRequestsCollection.findOne({ username: username });

    if (!user) {
        return [];
    }

    const sentRequestUsernames = Array.isArray(user.sent_requests) ? user.sent_requests : [];
    return sentRequestUsernames.map((friendUsername) => ({ username: friendUsername }));
}



module.exports = {
    askToBeFriend,
    getFriendRequestsReceived,
    alreadySentRequest,
    acceptFriendRequest,
    refuseFriendRequest,
    getFriends,
    removeFriend,
    areFriend,
    getIdByUserName,
    getFriendRequestsSent
};