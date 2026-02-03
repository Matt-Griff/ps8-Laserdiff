
const socket = io("http://localhost:8000");

socket.on("welcome", (message) => {
    console.log("Message from game server: " + message);
});

socket.on("connect", () => {
    console.log("Connected to gateway:", socket.id);
});

socket.on("disconnect", () => {
    console.log("Disconnected from gateway");
});

console.log("Socket communication module loaded");