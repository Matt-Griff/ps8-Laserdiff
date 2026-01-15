import { Sphinx, Anubis, Scarab, Pharaoh, MoveablePawn, MoveableRotateablePawn, RotateablePawn, Pyramid} from "../classes/game-classes.js";
import { getPawnPosition, getLeftAdjacentPiece, getRightAdjacentPiece, getTopAdjacentPiece, getBottomAdjacentPiece } from "./game-utils.js";

const dirMap = {
    'up': {dx: 0, dy: -1},
    'down': {dx: 0, dy: 1},
    'left': {dx: -1, dy: 0},
    'right': {dx: 1, dy: 0}
};

const rotatePieceClockwise = (piece) => {
    if(piece instanceof (MoveableRotateablePawn, RotateablePawn)) {
        piece.rotateClockwise();
    }
}

const rotatePieceCounterClockwise = (piece) => {
    if(piece instanceof (MoveableRotateablePawn, RotateablePawn)) {
        piece.rotateCounterClockwise();
    }
}

const movePiece = (board, piece, direction) => {

    if(!(piece instanceof (MoveablePawn, MoveableRotateablePawn))) {
        return;
    }

    const position = getPawnPosition(board, piece.owner.game_id, piece.constructor);
    if (!position) {
        console.error("Piece not found on the board.");
        return;
    }

    let {col, row} = position;

    const {dx, dy} = dirMap[direction];
    piece.moveBy(dx, dy);

    const newCol = col + dx;
    const newRow = row + dy;

    if (newCol >= 0 && newCol < board.length && newRow >= 0 && newRow < board[0].length) {
        board[newCol][newRow] = piece;
        board[col][row] = null;
    }

};

const placePyramid = (board, col, row, player) => {
    
    // The col and row are supposed to be validated before calling this function
    // There must be no piece at the target location
    // A pyramid musn't be orthogonally adjacent to player pharaoh or any sphinx

    if(player.pyramid_count <= 0) {
        console.error("No pyramids left to place.");
        return;
    }

    if(board[col][row] !== null) {
        console.error("Target location is not empty.");
        return;
    }

    const leftPiece = getLeftAdjacentPiece(board, col, row);
    const rightPiece = getRightAdjacentPiece(board, col, row);
    const topPiece = getTopAdjacentPiece(board, col, row);
    const bottomPiece = getBottomAdjacentPiece(board, col, row);

    const adjacentPieces = [leftPiece, rightPiece, topPiece, bottomPiece];
    if(adjacentPieces.some(piece => piece instanceof Sphinx || (piece instanceof Pharaoh && piece.owner === player))) {
        console.error("Cannot place pyramid adjacent to player's pharaoh or any sphinx.");
        return;
    }

    const pyramid = new Pyramid(player);
    
    board[col][row] = pyramid;
    player.pyramid_count -= 1;
}

const swapWithScarab = (board, piece, scarab) => {

    if(!(piece instanceof Pharaoh) || !(piece instanceof Sphinx)) {
        return;
    }

    if(!scarab || !(scarab instanceof Scarab)) {
        console.error("Invalid scarab piece.");
        return;
    }

    if(piece.scarabCooldown > 0) {
        console.error("Scarab swap is on cooldown.");
        return;
    }

    const piecePos = getPawnPosition(board, piece.owner.game_id, piece.constructor);
    const scarabPos = getPawnPosition(board, scarab.owner.game_id, scarab.constructor);

    if(!piecePos || !scarabPos) {
        console.error("Piece or scarab not found on the board.");
        return;
    }

    const {col: pieceCol, row: pieceRow} = piecePos;
    const {col: scarabCol, row: scarabRow} = scarabPos;
    board[pieceCol][pieceRow] = scarab;
    board[scarabCol][scarabRow] = piece;
    piece.scarabCooldown = 4;    
}

export {
    rotatePieceClockwise,
    rotatePieceCounterClockwise,
    movePiece,
    placePyramid,
    swapWithScarab
}

