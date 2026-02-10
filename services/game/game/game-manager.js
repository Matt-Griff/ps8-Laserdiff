import { GameLogicManager } from "./controllers/game-logic-manager.js";
import { UIManager } from "./controllers/ui-manager.js";
import { Player } from "./classes/game-classes.js";


export default class GameManager {
    constructor(mode = "local", gateWaySocket, clientIds = []) {
        let playerArray = this.getPlayer(mode);
        this.uiManager = new UIManager(gateWaySocket, clientIds);
        this.gameLogic = new GameLogicManager(this.uiManager, playerArray[0], playerArray[1]);
    }

    getPlayer(mode) {
        if (mode === "local") {
            return [new Player(1, "Player 1", false), new Player(2, "Player 2", false)];
        } else if (mode === "ai") {
            return [new Player(1, "Player 1", false), new Player(2, "AI", true)];
        } else {
            return [new Player(1, "Player 1", false), new Player(2, "Player 2", false)];
        }
    }

    startGame() {
        this.gameLogic.start();
    }
}