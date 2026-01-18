import { createBoard, initGamePieces, displayBoard } from "./functions/game-functions.js";
import { Player, Pharaoh, Anubis } from "./classes/game-classes.js";
import { rotatePieceClockwise, rotatePieceCounterClockwise, movePiece, possibleMoves } from "./functions/game-actions-functions.js";


function initializeBoard(player1, player2) {
    let board = createBoard();
    initGamePieces(board, player1, player2);
    return board;
}


document.addEventListener("DOMContentLoaded", () => {
    const board_gui = document.querySelector("#game-board");
    const player1 = new Player(1, "Player 1");
    const player2 = new Player(2, "Player 2");
    const board = initializeBoard(player1, player2);
    displayBoard(board);

    startGameLoop(board_gui, board, player1, player2);
});

async function startGameLoop(board_gui, board, player1, player2) {
    board_gui.setBoard(board);
    let userClickPosition = null;
    let currentPlayer = player1;

    while (true) {
        userClickPosition = await board_gui.waitForUserClick();

        let possibleMovesList = possibleMoves(
            board,
            currentPlayer,
            userClickPosition.row,
            userClickPosition.col
        );
        board_gui.setPossibleMoves(possibleMovesList);

        

        
    }
}
