const { parseBody } = require("../bodyparser/bodyparser.js");
const { getLeaderboard, updateLeaderboard } = require("../data/mongo.js");

const handleGetLeaderboard = async (req, res) => {
    try {
        const leaderboard = await getLeaderboard();
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(leaderboard));
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
}

const handleUpdateLeaderboard = async (req, res) => {
    try {
        const body = await parseBody(req);

        if(!body || !body.username || typeof body.elo !== "number") {
            res.statusCode = 400;
            res.end("Bad Request: Missing or invalid username or elo");
            return;
        }

        const newLeague = computeNewLeague(body.elo);
        await updateLeaderboard(body.username, body.elo, newLeague);
        
        res.statusCode = 200;
        res.end("Leaderboard updated successfully");
    } catch (error) {
        console.error("Error updating leaderboard:", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
}

export { handleGetLeaderboard, handleUpdateLeaderboard };