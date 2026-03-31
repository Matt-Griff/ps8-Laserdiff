const http = require("http");
const { handleGetLeaderboard, handleUpdateLeaderboard } = require("./handler/leaderboard-handler");

const RANKING_PORT = 8005;

http.createServer(function (req, res) {
    console.log(`Received query : ${req.url} with method ${req.method}`);
    
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if(req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
    }

    if (req.url.startsWith("/api/leaderboard") && req.method === "GET") {
        handleGetLeaderboard(req, res);
        return;
    } else if (req.url.startsWith("/api/leaderboard") && req.method === "PUT") {
        handleUpdateLeaderboard(req, res);
        return;
    }

}).listen(RANKING_PORT, () => {
    console.log(`Ranking service listening on port ${RANKING_PORT}`);
});