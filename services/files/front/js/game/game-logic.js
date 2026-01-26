// main.js
import { GameManager } from "./classes/GameManager.js";
import { UIManager } from "./classes/UIManager.js";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize the UI View
    const ui = new UIManager();

    // 2. Initialize the Logic Controller, injecting the UI
    const game = new GameManager(ui);

    // 3. Start the game
    game.start();
});