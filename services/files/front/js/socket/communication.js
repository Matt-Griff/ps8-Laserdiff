export class SocketCommunication {
    constructor(uiManager, socket) {
        this.socket = socket;
        this.uiManager = uiManager;
    }

    bind() {
        this.bindSocketEvents();
        this.bindUi(this.uiManager);
    }

    bindSocketEvents() {
        this.socket.on("welcome", (payload) => {
            console.log("Received welcome from server:", payload);
            this.uiManager.displayMessage(payload.data);
        });
    }

    bindUi(uiManager) {
        uiManager.bindEvents(
            {
                onCellClick: (row, col) => this.handleCellClick(row, col),
                onReserveClick: (pid) => this.handleReserveClick(pid),
                onRotate: (direction) => this.handleRotation(direction),
                onSwap: () => this.handleSwap(),
            }
        )
    }

    handleCellClick(row, col) {
        console.log(`Cell clicked at row ${row}, col ${col}`);
        this.socket.emit("cell_click", { 'row': row, 'col': col });
    }

    handleReserveClick(pid) {
        console.log(`Reserve clicked for player ${pid}`);
        this.socket.emit("reserve_click", { 'playerId': pid });
    }

    handleRotation(direction) {
        console.log(`Rotation requested: ${direction}`);
        this.socket.emit("rotate", { 'direction': direction });
    }

    handleSwap() {
        console.log("Swap requested");
        this.socket.emit("swap");
    }
}