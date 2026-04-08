const { parseBody } = require("../bodyparser/bodyparser.js");
const { getLeaderboard, updateLeaderboard, getLeague, updateLeague } = require("../data/mongo.js");
const { computeNewLeague, leaguesToThresholds } = require("../func/league.js");

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

const handleGetLeague = async (req, res) => {
    try {
        const username = req.url.split("/")[3];

        if(!username) {
            res.statusCode = 400;
            res.end("Bad Request: Missing username");
            return;
        }

        const league = await getLeague(username);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ league: league }));
    } catch (error) {
        console.error("Error fetching league:", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
}

const handleUpdateLeague = async (req, res) => {
    try {
        const username = req.url.split("/")[3];

        if(!username) {
            res.statusCode = 400;
            res.end("Bad Request: Missing username");
            return;
        }

        const body = await parseBody(req);

        if(!body || !body.elo) {
            res.statusCode = 400;
            res.end("Bad Request: Missing league");
            return;
        }

        const league = computeNewLeague(body.elo);

        await updateLeague(username, league);

        res.statusCode = 200;
        res.end("League updated successfully");
    } catch (error) {
        console.error("Error updating league:", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
}

const handleGetLeagueToThresholds = async (req, res) => {
    console.log("Received request for league to thresholds");
    try {
        const leagueToThresholds = leaguesToThresholds;
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(leagueToThresholds));
    }
    catch (error) {
        console.error("Error fetching league to thresholds:", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
}


module.exports = { handleGetLeaderboard, handleUpdateLeaderboard, handleGetLeague, handleUpdateLeague, handleGetLeagueToThresholds };