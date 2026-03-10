const { MongoClient, ObjectId } = require("mongodb");

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

const addFriend = async (userId, friendId) => {
    await connectDB();
    const db = client.db(dbName);
    const friendsCollection = db.collection("friends");
    const userObjectId = new ObjectId(userId);
    const friendObjectId = new ObjectId(friendId);

    await friendsCollection.updateOne(
        { _id: userObjectId },
        { $addToSet: { friends: friendObjectId } },
        { upsert: true }
    );
    await friendsCollection.updateOne(
        { _id: friendObjectId },
        { $addToSet: { friends: userObjectId } },
        { upsert: true }
    );
}

const askToBeFriend = async (userId, friendId) => {
    await connectDB();
    const db = client.db(dbName);
    const usersCollection = db.collection("friend_requests");
    const userObjectId = new ObjectId(userId);
    const friendObjectId = new ObjectId(friendId);
    // Add friendId to user's friend requests list
    await usersCollection.updateOne(
        { _id: userObjectId },
        { $addToSet: { sent_requests: friendObjectId } },
        { upsert: true }
    );
    // Add userId to friend's friend requests list
    await usersCollection.updateOne(
        { _id: friendObjectId },
        { $addToSet: { received_requests: userObjectId } },
        { upsert: true });
}

const getFriendRequestsReceived = async (userId) => {
    await connectDB();
    const db = client.db(dbName);
    const usersCollection = db.collection("friend_requests");
    const userObjectId = new ObjectId(userId);
    const user = await usersCollection.findOne({ _id: userObjectId });
    if (!user) {
        throw new Error("User not found");
    }
    const receivedRequestIds = user.received_requests || [];

    const usersCol = db.collection("users");
    const senders = await usersCol.find({ _id: { $in: receivedRequestIds } }).toArray();
    return senders.map(u => ({ id: u._id.toString(), name: u.username }));
}

const alreadySentRequest = async (userId, friendId) => {
    await connectDB();
    const db = client.db(dbName);
    const usersCollection = db.collection("friend_requests");
    const userObjectId = new ObjectId(userId);
    const friendObjectId = new ObjectId(friendId);

    const user = await usersCollection.findOne({ _id: userObjectId });
    if (!user) {
        throw new Error("User not found");
    }
    const sentRequestIds = user.sent_requests || [];
    return sentRequestIds.some(id => id.equals(friendObjectId));
}

const acceptFriendRequest = async (userId, friendId) => {
    await connectDB();
    const db = client.db(dbName);
    const requestsCollection = db.collection("friend_requests");
    const friendsCollection = db.collection("friends");
    const userObjectId = new ObjectId(userId);
    const friendObjectId = new ObjectId(friendId);

    // Remove userId from friend's sent requests list (friend sent the request)
    const result1 = await requestsCollection.updateOne(
        { _id: friendObjectId },
        { $pull: { sent_requests: userObjectId } }
    );

    // Remove friendId from user's received requests list (user received the request)
    const result2 = await requestsCollection.updateOne(
        { _id: userObjectId },
        { $pull: { received_requests: friendObjectId } }
    );

    if (result1.modifiedCount === 0 || result2.modifiedCount === 0) {
        throw new Error("Friend request not found");
    }

    // Add friendId to user's friends list
    await friendsCollection.updateOne(
        { _id: userObjectId },
        { $addToSet: { friends: friendObjectId } },
        { upsert: true }
    );

    // Add userId to friend's friends list
    await friendsCollection.updateOne(
        { _id: friendObjectId },
        { $addToSet: { friends: userObjectId } },
        { upsert: true }
    );
}

const getFriends = async (userId) => {
    await connectDB();
    const db = client.db(dbName);
    const usersCollection = db.collection("friends");

    const userObjectId = new ObjectId(userId);

    const user = await usersCollection.findOne({ _id: userObjectId });
    if (!user) {
        throw new Error("User not found");
    }
    const friendIds = user.friends || [];

    const friends = await usersCollection.find({ _id: { $in: friendIds } }).toArray();
    return friends.map(friend => ({ id: friend._id.toString(), name: friend.name }));
}

const removeFriend = async (userId, friendId) => {
    await connectDB();
    const db = client.db(dbName);
    const usersCollection = db.collection("friends");
    const userObjectId = new ObjectId(userId);
    const friendObjectId = new ObjectId(friendId);
    // Remove friendId from user's friends list
    await usersCollection.updateOne(
        { _id: userObjectId },
        { $pull: { friends: friendObjectId } }
    );

    // Remove userId from friend's friends list
    await usersCollection.updateOne(
        { _id: friendObjectId },
        { $pull: { friends: userObjectId } }
    );
}

const areFriend = async (userId, friendId) => {
    await connectDB();
    const db = client.db(dbName);
    const usersCollection = db.collection("friends");
    const userObjectId = new ObjectId(userId);
    const friendObjectId = new ObjectId(friendId);

    const user = await usersCollection.findOne({ _id: userObjectId });
    if (!user) {
        throw new Error("User not found");
    }
    const friendIds = user.friends || [];
    return friendIds.some(id => id.equals(friendObjectId));
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

const refuseFriendRequest = async (userId, friendId) => {
    await connectDB();
    const db = client.db(dbName);
    const requestsCollection = db.collection("friend_requests");
    const userObjectId = new ObjectId(userId);
    const friendObjectId = new ObjectId(friendId);
    // Remove userId from friend's sent requests list (friend sent the request)
    const result1 = await requestsCollection.updateOne(
        { _id: friendObjectId },
        { $pull: { sent_requests: userObjectId } }
    );

    // Remove friendId from user's received requests list (user received the request)
    const result2 = await requestsCollection.updateOne(
        { _id: userObjectId },
        { $pull: { received_requests: friendObjectId } }
    );

    if (result1.modifiedCount === 0 || result2.modifiedCount === 0) {
        throw new Error("Friend request not found");
    }
}



module.exports = {
    addFriend,
    askToBeFriend,
    getFriendRequestsReceived,
    alreadySentRequest,
    acceptFriendRequest,
    refuseFriendRequest,
    getFriends,
    removeFriend,
    areFriend,
    getIdByUserName
};