const axios = require("axios");
const { parseBody } = require("../bodyparser/bodyparser");

const RANKING_SERVICE_URL = process.env.RANKING_SERVICE_URL || "http://localhost:8005";

const handleRankRequest = async (req, res, filePath) => {
    console.log(`Received ranking request for ${req.url} with method ${req.method}`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
    }

    try {
        if(req.method === "GET") {
            const endpoint = filePath.slice(1).join("/");
            const serviceRes = await axios.get(`${RANKING_SERVICE_URL}/${endpoint}`, {
                headers: {
                    "Authorization": req.headers["authorization"]
                } 
            });

            res.statusCode = serviceRes.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(serviceRes.data));
            return;
        }

        if(req.method === "PUT") {
            const body = await parseBody(req);
            const endpoint = filePath.slice(1).join("/");
            const serviceRes = await axios.put(`${RANKING_SERVICE_URL}/${endpoint}`, body, {
                headers: {
                    "Authorization": req.headers["authorization"]
                } 
            });

            res.statusCode = serviceRes.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(serviceRes.data));
            return;
        }
    } catch (error) {
        console.error("Error forwarding request to Ranking service:", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }
}

const handleHistoryRequest = async (req, res, filePath) => {
    console.log(`Received history request for ${req.url} with method ${req.method}`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
    }

    try {

        if(req.method === "GET") {
            const endpoint = filePath.slice(1).join("/");
            const serviceRes = await axios.get(`${RANKING_SERVICE_URL}/${endpoint}`, {
                headers: {
                    "Authorization": req.headers["authorization"]
                } 
            });

            res.statusCode = serviceRes.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(serviceRes.data));
            return;
        }
        
        if(req.method === "POST") {
            const body = await parseBody(req);
            const endpoint = filePath.slice(1).join("/");
            const serviceRes = await axios.post(`${RANKING_SERVICE_URL}/${endpoint}`, body, {
                headers: {
                    "Authorization": req.headers["authorization"]
                } 
            });

            res.statusCode = serviceRes.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(serviceRes.data));
            return;
        }
    } catch (error) {
        console.error("Error forwarding request to Ranking service:", error);
        res.statusCode = 500;
        res.end("Internal Server Error");
    }

}

module.exports = { handleRankRequest, handleHistoryRequest };