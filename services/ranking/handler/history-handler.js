const { parseBody } = require("../bodyparser/bodyparser");
const { getHistory, updateHistory } = require("../data/mongo");

const handleGetHistory = async (req, res) => {
    try {
        const username = req.url.split("/")[3];

        if(!username) {
            res.statusCode = 400;
            res.end("Bad Request: Missing username");
            return;
        }

        const history = await getHistory(username);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(history));
    } catch (error) {
        console.error("Error fetching history:", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
}

const handleUpdateHistory = async (req, res) => {
    try {
        const username = req.url.split("/")[3];

        if(!username) {
            res.statusCode = 400;
            res.end("Bad Request: Missing username");
            return;
        }
        
        const body = await parseBody(req);

        if(!body) {
            res.statusCode = 400;
            res.end("Bad Request: Missing game data");
            return;
        }
        
        await updateHistory(username, body);
        res.statusCode = 200;
        res.end("History updated successfully");
    } catch (error) {
        console.error("Error updating history:", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
}

module.exports =  { handleGetHistory, handleUpdateHistory };