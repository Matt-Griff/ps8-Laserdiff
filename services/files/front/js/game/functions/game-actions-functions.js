import { Sphinx, Anubis, Scarab, Pharaoh, MoveablePawn, MoveableRotateablePawn, RotateablePawn} from "../classes/game-classes.js";
import { getPawnPosition } from "./game-utils.js";

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

    const dirMap = {
        'up': {dx: 0, dy: -1},
        'down': {dx: 0, dy: 1},
        'left': {dx: -1, dy: 0},
        'right': {dx: 1, dy: 0}
    };

    const {dx, dy} = dirMap[direction];
    piece.moveBy(dx, dy);

    const newCol = col + dx;
    const newRow = row + dy;

    if (newCol >= 0 && newCol < board.length && newRow >= 0 && newRow < board[0].length) {
        board[newCol][newRow] = piece;
        board[col][row] = null;
    }

}

export {
    rotatePieceClockwise,
    rotatePieceCounterClockwise,
    movePiece
}

