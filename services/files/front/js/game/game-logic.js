import { createBoard, initGamePieces, displayBoard } from "./functions/game-functions.js";
import { Player, Pharaoh, Anubis } from "./classes/game-classes.js";
import { rotatePieceClockwise, rotatePieceCounterClockwise, movePiece } from "./functions/game-actions-functions.js";
let player1 = new Player(1, "Alice");
let player2 = new Player(2, "Bob");

let board = createBoard();

initGamePieces(board, player1, player2);
displayBoard(board);

const board_gui = document.querySelector("#game-board");
board_gui.setBoard(board);