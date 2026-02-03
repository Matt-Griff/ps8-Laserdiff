const socketIO = require('socket.io');
const ioClient = require('socket.io-client');

const handleSocketIoRequests = (server) => {
    // Create Socket.IO server on the gateway (A socket B)
    const io = socketIO(server, {
        path: '/socket.io',
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Connect to backend Socket.IO service (B socket C)
    const backendSocket = ioClient('http://127.0.0.1:8002', {
        reconnection: true,
        reconnectionDelay: 1000
    });

    backendSocket.on('connect', () => {
        console.log('Gateway connected to backend Socket.IO service');
    });

    backendSocket.on('disconnect', (reason) => {
        console.log('Gateway disconnected from backend:', reason);
    });

    backendSocket.on('connect_error', (error) => {
        console.error('Gateway connection error to backend:', error.message);
    });

    // Map to track client sockets
    const clientSockets = new Map();

    // Handle client connections (A socket B)
    io.on('connection', (clientSocket) => {
        console.log(`Client connected: ${clientSocket.id}`);

        // Store the client socket
        clientSockets.set(clientSocket.id, clientSocket);

        //  IMPORTANT: Notifier le backend de la nouvelle connexion
        console.log(` Notifying backend of new client ${clientSocket.id}`);
        backendSocket.emit('client_connected', {
            clientId: clientSocket.id,
            data: { timestamp: Date.now() }
        });

        // Forward client messages to backend
        clientSocket.onAny((eventName, ...args) => {
            console.log(` Forwarding event "${eventName}" from client ${clientSocket.id} to backend`);

            // Include client ID so backend knows which client sent it
            backendSocket.emit(eventName, {
                clientId: clientSocket.id,
                data: args
            });
        });

        // Handle client disconnect
        clientSocket.on('disconnect', () => {
            console.log(`Client disconnected: ${clientSocket.id}`);
            clientSockets.delete(clientSocket.id);

            // Notify backend about disconnect
            backendSocket.emit('client_disconnect', { clientId: clientSocket.id });
        });
    });

    // Handle messages from backend and forward to appropriate clients
    backendSocket.onAny((eventName, payload) => {
        console.log(` Received event "${eventName}" from backend`, payload);

        if (payload && payload.clientId) {
            // Message for specific client
            const clientSocket = clientSockets.get(payload.clientId);
            if (clientSocket) {
                console.log(` Forwarding to client ${payload.clientId}`);
                clientSocket.emit(eventName, payload.data);
            } else {
                console.log(`Client ${payload.clientId} not found in clientSockets`);
            }
        } else if (payload && payload.broadcast) {
            // Broadcast to all clients
            console.log(` Broadcasting to all clients`);
            io.emit(eventName, payload.data);
        } else if (payload && payload.room) {
            // Send to specific room
            console.log(` Sending to room ${payload.room}`);
            io.to(payload.room).emit(eventName, payload.data);
        } else {
            console.log(` Received event without proper routing info:`, payload);
        }
    });

    console.log('Socket.IO handler set up on gateway');
}

exports.handleSocketIoRequests = handleSocketIoRequests;