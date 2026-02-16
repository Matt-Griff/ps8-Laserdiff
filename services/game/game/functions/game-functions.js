import { initSphinx, initPharaoh, initFirstAnubis, initSecondAnubis, initScarab } from "./game-init-functions.js";
import { BOARDSIZE } from "../utils/game-constants.js";
import { Sphinx, Pharaoh, Scarab } from "../classes/game-classes.js";
import { getPawnPosition, getScarabOfPlayer } from "../functions/game-utils.js";

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
    const scarabOrientation = Math.random() < 0.5 ? 0 : 90;
    initScarab(board, player1, scarabOrientation);
    initScarab(board, player2, scarabOrientation);
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

const serializeBoard = (board, playerID) => {
    const serializedBoard = {};
    const sphinxPos = getPawnPosition(board, playerID, Sphinx);
    const scarab = getScarabOfPlayer(board, playerID);
    const pharaohPos = getPawnPosition(board, playerID, Pharaoh);
    const scarabPos = getPawnPosition(board, playerID, Scarab);
    serializedBoard['sphinx'] = sphinxPos ? getSerializedPos(sphinxPos.row, sphinxPos.col) : null;
    serializedBoard['pharaoh'] = pharaohPos ? getSerializedPos(pharaohPos.row, pharaohPos.col) : null;
    serializedBoard['scarab'] = { position: scarabPos ? getSerializedPos(scarabPos.row, scarabPos.col) : null, orientation: scarab.orientation % 180 == 0 ? 9 : 0 };
    return serializedBoard;
}

const getSerializedPos = (row, col) => {
    return (row) * 10 + (col);
}

const getUnserializedPos = (pos) => {
    const row = Math.floor(pos / 10);
    const col = (pos % 10);
    return { row, col };
}

export {
    createBoard,
    displayBoard,
    initGamePieces,
    serializeBoard,
    getSerializedPos,
    getUnserializedPos
}