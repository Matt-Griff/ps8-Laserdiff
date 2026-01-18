import { createBoard, initGamePieces, displayBoard } from "./functions/game-functions.js";
import { Player, Pharaoh, Anubis } from "./classes/game-classes.js";
import { rotatePieceClockwise, rotatePieceCounterClockwise, movePiece, possibleMoves, shootLaser, checkGameOver } from "./functions/game-actions-functions.js";


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
    let gameOver = false;
    let turnCount = 0;
    let maxTurns = 100; // Prevent infinite games
    let winner = null;
    let playerPlayed = false;

    while (!gameOver && turnCount < maxTurns) {
        let clikedPiece = null;
        let clickedPiecePosition = null;
        while (!playerPlayed) {
            userClickPosition = await board_gui.waitForUserClick();
            let clickedPieceTMP = board[userClickPosition.row][userClickPosition.col];

            if (clickedPieceTMP && clickedPieceTMP.owner === currentPlayer) {
                let possibleMovesList = possibleMoves(board, currentPlayer, userClickPosition.row, userClickPosition.col);
                board_gui.setPossibleMoves(possibleMovesList);
                clikedPiece = clickedPieceTMP;
                clickedPiecePosition = { row: userClickPosition.row, col: userClickPosition.col };
            }
            else if (clikedPiece) {
                playerPlayed = movePiece(board, clickedPiecePosition.row, clickedPiecePosition.col, userClickPosition.row, userClickPosition.col);
            }
        }

        board_gui.setPossibleMoves(null);
        board_gui.setBoard(board);

        let laserMap = shootLaser(board, currentPlayer);
        board_gui.displayLaserPath(laserMap, currentPlayer.game_id);

        // Check for game over condition 
        let winner = checkGameOver(board, player1, player2);
        if (winner) {
            gameOver = true;
            console.log(`Game Over! Winner is Player ${winner.game_id}`);
        }

        // Switch players
        console.log(`End of turn ${turnCount + 1} for Player ${currentPlayer.game_id}`);
        currentPlayer = currentPlayer === player1 ? player2 : player1;
        playerPlayed = false;
        turnCount++;
    }
}
