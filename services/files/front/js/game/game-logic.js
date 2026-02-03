// main.js
import { GameManager } from "./classes/game-manager.js";
import { UIManager } from "./classes/ui-manager.js";
import { Player } from "./classes/game-classes.js";


document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize the UI View
    const ui = new UIManager();

    let player1 = null;
    let player2 = null;

    if (document.URL.includes("mode=1v1-local")) {
        player1 = new Player(1, "Player 1", false);
        player2 = new Player(2, "Player 2", false);
        console.log("1 v 1 Local Mode Selected");
    } else if (document.URL.includes("mode=ai-vs-player")) {
        player1 = new Player(1, "AI", true);
        player2 = new Player(2, "Player 2", false);
        console.log("AI vs Player Mode Selected");
    }
    // 2. Initialize the Logic Controller, injecting the UI
    const game = new GameManager(ui, player1, player2);

    // 3. Start the game
    game.start();


});