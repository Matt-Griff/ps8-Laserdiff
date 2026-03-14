import http from "http";
import { Server } from "socket.io";
import { setupChatHandlers } from "./requestManager.js";

const server = http.createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

setupChatHandlers(io);

server.listen(8003, () => {
    console.log("Chat service listening on port 8003");
});
