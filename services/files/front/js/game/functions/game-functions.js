import { initSphinx, initPharaoh, initFirstAnubis, initSecondAnubis, initScarab } from "./game-init-functions.js";
import { BOARDSIZE } from "../utils/game-constants.js";

const createBoard = () => {
    return new Array(BOARDSIZE).fill(null).map(() => new Array(BOARDSIZE).fill(null));
}


const initGamePieces = (board, player1, player2) => {
    initSphinx(board, player1);
    initSphinx(board, player2);
    initPharaoh(board, player1);
    initPharaoh(board, player2);
    initFirstAnubis(board, player1);
    initFirstAnubis(board, player2);
    initSecondAnubis(board, player1);
    initSecondAnubis(board, player2);
    initScarab(board, player1);
    initScarab(board, player2);    
}

const displayBoard = (board) => {
    for (let row = 0; row < BOARDSIZE; row++) {
        let rowString = "";
        for (let col = 0; col < BOARDSIZE; col++) {
            const pawn = board[row][col];
            rowString += pawn ? pawn.constructor.name.charAt(0) + pawn.owner.game_id : ".";
            rowString += " ";
        }
        console.log(rowString);
    }
}


export {
    createBoard,
    displayBoard,
    initGamePieces
}