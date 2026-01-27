// Constraints:
// 1. No online resources.
// 2. No external data.
// 3. No libraries.
// 4. State is transient (per game only)
// ! Any cheat will lead to an automatic loss. !

const BOARD_SIZE = 10;
const INITIAL_PYRAMIDS = 7;
const SWAP_COOLDOWN = 4;

let botId = 0;
let opponentId = 0;
let board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
);  // 10x10 board
let myPieces = [];
// Cooldowns and reserve state
let myReserve = INITIAL_PYRAMIDS;
let myCooldowns = {
    sphinx: 0,
    pharaoh: 0
};

// Initialize board from initial positions
function initBoard(initialPositions) {
    board = Array.from({ length: 10 }, () =>
        Array.from({ length: 10 }, () => null)
    );
    myPieces = [];
    myReserve = INITIAL_PYRAMIDS;
    myCooldowns = { sphinx: 0, pharaoh: 0 };

    // Place first player pieces
    const p1 = initialPositions;
    let sphinxCords = cellToCoords(p1.sphinx);
    let pharaohCords = cellToCoords(p1.pharaoh);
    let scarabCords = cellToCoords(p1.scarab.position);

    let anubis1Row = (sphinxCords.row === 0) ? 4 : 5;
    let anubis2row = (sphinxCords.row === 0) ? 2 : 7;
    let orientation1 = (sphinxCords.row === 0) ? 0 : 180;

    const mirrorCord = (coord) => 9 - coord;

    board[sphinxCords.row][sphinxCords.col] = { type: 'sphinx', owner: 1, orientation: orientation1 };
    board[pharaohCords.row][pharaohCords.col] = { type: 'pharaoh', owner: 1 };
    board[scarabCords.row][scarabCords.col] = { type: 'scarab', owner: 1, orientation: p1.scarab.orientation };
    board[anubis1Row][pharaohCords.col] = { type: 'anubis', owner: 1, orientation: orientation1 };
    board[anubis2row][mirrorCord(sphinxCords.col)] = { type: 'anubis', owner: 1, orientation: orientation1 };

    // Place second player pieces symmetrically
    const mirrorOrientation = (orient) => (orient + 180) % 360;

    // Simple 180 mirror
    board[mirrorCord(sphinxCords.row)][mirrorCord(sphinxCords.col)] = { type: 'sphinx', owner: 2, orientation: mirrorOrientation(orientation1) };
    board[mirrorCord(pharaohCords.row)][mirrorCord(pharaohCords.col)] = { type: 'pharaoh', owner: 2 };
    board[mirrorCord(scarabCords.row)][mirrorCord(scarabCords.col)] = { type: 'scarab', owner: 2, orientation: mirrorOrientation(p1.scarab.orientation) };
    board[mirrorCord(anubis1Row)][mirrorCord(pharaohCords.col)] = { type: 'anubis', owner: 2, orientation: mirrorOrientation(orientation1) };
    board[mirrorCord(anubis2row)][sphinxCords.col] = { type: 'anubis', owner: 2, orientation: mirrorOrientation(orientation1) };
    // Track our pieces

    console.log("Board initialized:", board);

    refreshMyPieces();
}

// Convert cell number to row/col
function cellToCoords(cell) {
    return { row: Math.floor(cell / 10), col: (cell % 10) };
}

// Convert row/col to cell number
function coordsToCell(row, col) {
    return (row) * 10 + (col);
}

// Orientation to direction vector
const orientationToDir = {
    0: { dx: 0, dy: -1 },    // Up
    90: { dx: 1, dy: 0 },    // Right
    180: { dx: 0, dy: 1 },   // Down
    270: { dx: -1, dy: 0 }   // Left
};

// Get the hit side based on laser direction
function getHitSide(dx, dy) {
    if (dx === 0 && dy === -1) return 'down';
    if (dx === 0 && dy === 1) return 'up';
    if (dx === -1 && dy === 0) return 'right';
    if (dx === 1 && dy === 0) return 'left';
    return null;
}

// Check if a piece is protected from a given hit side
function isProtected(piece, hitSide) {
    if (piece.type === 'sphinx') return true; // Sphinx is protected from all sides
    if (piece.type === 'pharaoh') return false; // Pharaoh has no protection
    if (piece.type === 'scarab') return false; // Scarab reflects but isn't protected

    if (piece.type === 'anubis') {
        // Anubis is protected on its front side only
        const protectedSideMap = { 0: 'up', 90: 'right', 180: 'down', 270: 'left' };
        return protectedSideMap[piece.orientation] === hitSide;
    }

    if (piece.type === 'pyramid') {
        // Pyramid has no protection, only reflection
        return false;
    }

    return false;
}

// Check if a piece can reflect from a given hit side
function canReflect(piece, hitSide) {
    if (piece.type !== 'pyramid' && piece.type !== 'scarab') return false;

    const orientation = piece.orientation || 0;
    const sideToAngle = { 'up': 0, 'right': 90, 'down': 180, 'left': 270 };
    const hitAngle = sideToAngle[hitSide];
    const relativeSide = (hitAngle - orientation + 360) % 360;

    // Pyramid reflects on back (180) and rightSide (90)
    // Scarab reflects on all sides
    if (piece.type === 'scarab') return true;
    return relativeSide === 180 || relativeSide === 90;
}

// Get new laser direction after reflection
function getReflectedDirection(piece, hitSide, dx, dy) {
    const orientation = piece.orientation || 0;
    const sideToAngle = { 'up': 0, 'right': 90, 'down': 180, 'left': 270 };
    const hitAngle = sideToAngle[hitSide];
    const relativeSide = (hitAngle - orientation + 360) % 360;

    let exitOrientation;
    if (relativeSide === 180) { // back
        exitOrientation = (orientation + 90) % 360;
    } else if (relativeSide === 90) { // rightSide
        exitOrientation = (orientation + 180) % 360;
    } else if (relativeSide === 0) { // front
        exitOrientation = (orientation + 270) % 360;
    } else { // leftSide
        exitOrientation = orientation;
    }

    return orientationToDir[exitOrientation];
}

// Simulate the laser shooting after a player's turn
function shootLaser(playerId) {
    // Find the sphinx of the player who just moved
    let sphinxCell = -1;
    let sphinxPiece = null;
    for (let i = 0; i < board.length; i++) {
        if (board[i] && board[i].type === 'sphinx' && board[i].owner === playerId) {
            sphinxCell = i;
            sphinxPiece = board[i];
            break;
        }
    }

    if (sphinxCell === -1 || !sphinxPiece) return;

    const { row: startRow, col: startCol } = cellToCoords(sphinxCell);
    let { dx, dy } = orientationToDir[sphinxPiece.orientation || 0];

    let laserRow = startRow + dy;
    let laserCol = startCol + dx;

    while (laserRow >= 0 && laserRow < BOARD_SIZE && laserCol >= 0 && laserCol < BOARD_SIZE) {
        const cell = coordsToCell(laserRow, laserCol);
        const targetPiece = board[cell];

        if (targetPiece) {
            const hitSide = getHitSide(dx, dy);

            // Check if protected
            if (isProtected(targetPiece, hitSide)) {
                break;
            }

            // Check if can reflect
            if (canReflect(targetPiece, hitSide)) {
                const newDir = getReflectedDirection(targetPiece, hitSide, dx, dy);
                dx = newDir.dx;
                dy = newDir.dy;
            } else {
                // Piece is destroyed
                board[cell] = null;
                break;
            }
        }

        laserRow += dy;
        laserCol += dx;
    }

    refreshMyPieces();
}

// Get adjacent cells (for moves)
function getAdjacentCells(cell) {
    const { row, col } = cellToCoords(cell);
    const adjacent = [];
    if (row > 0) adjacent.push(coordsToCell(row - 1, col)); // up
    if (row < BOARD_SIZE - 1) adjacent.push(coordsToCell(row + 1, col)); // down
    if (col > 0) adjacent.push(coordsToCell(row, col - 1)); // left
    if (col < BOARD_SIZE - 1) adjacent.push(coordsToCell(row, col + 1)); // right
    return adjacent;
}

// Check if a cell is orthogonally adjacent to any Sphinx or your own Pharaoh
function isAdjacentToRestricted(cell, playerId) {
    const adjacent = getAdjacentCells(cell);
    for (const adjCell of adjacent) {
        const piece = board[adjCell];
        if (piece) {
            if (piece.type === 'sphinx') return true;
            if (piece.type === 'pharaoh' && piece.owner === playerId) return true;
        }
    }
    return false;
}


// Refresh the myPieces array
function refreshMyPieces() {
    myPieces = [];
    for (let i = 0; i < board.length; i++) {
        if (board[i] && board[i].owner === botId) {
            myPieces.push({ ...board[i], cell: i });
        }
    }
}

// Apply an action to our internal board state
function applyAction(action, playerId) {
    // If it's our turn, decrement cooldowns
    if (playerId === botId) {
        if (myCooldowns.sphinx > 0) myCooldowns.sphinx--;
        if (myCooldowns.pharaoh > 0) myCooldowns.pharaoh--;
    }

    if (!action) {
        // Even if no action, laser still shoots
        shootLaser(playerId);
        return;
    }

    const { action: actionType, cell, result } = action;

    switch (actionType) {
        case 'MOVE':
            if (board[cell]) {
                board[result] = board[cell];
                board[cell] = null;
            }
            break;
        case 'ROTATE':
            if (board[cell]) {
                const piece = board[cell];
                if (result === 'CLOCKWISE') {
                    piece.orientation = ((piece.orientation || 0) + 270) % 360;
                } else {
                    piece.orientation = ((piece.orientation || 0) + 90) % 360;
                }
            }
            break;
        case 'PLACE':
            board[result.destination] = {
                type: 'pyramid',
                owner: playerId,
                orientation: result.orientation
            };
            if (playerId === botId) {
                myReserve--;
            }
            break;
        case 'EXCHANGE':
            if (board[cell] && board[result]) {
                const temp = board[cell];
                board[cell] = board[result];
                board[result] = temp;

                // Set cooldown if we are the ones swapping
                if (playerId === botId) {
                    // One of the pieces involved is the Scarab, the other is Sphinx or Pharaoh
                    // We check both involved pieces to determine which cooldown to activate
                    const piece1 = board[cell];
                    const piece2 = board[result];

                    if (piece1.type === 'sphinx' || piece2.type === 'sphinx') {
                        myCooldowns.sphinx = SWAP_COOLDOWN;
                    }
                    if (piece1.type === 'pharaoh' || piece2.type === 'pharaoh') {
                        myCooldowns.pharaoh = SWAP_COOLDOWN;
                    }
                }
            }
            break;
    }

    // Shoot laser after action
    shootLaser(playerId);

    refreshMyPieces();
}

// Find all moveable pieces (Anubis, Pyramid, Scarab)
function getMoveablePieces() {
    return myPieces.filter(p => p.type !== 'sphinx' && p.type !== 'pharaoh');
}

// Find all rotateable pieces (Sphinx, Anubis, Scarab, Pyramid)
function getRotateablePieces() {
    return myPieces.filter(p => ['sphinx', 'anubis', 'scarab', 'pyramid'].includes(p.type));
}

// Generate all possible actions
function getAllPossibleActions() {
    const actions = [];

    // 1. MOVE actions
    // Move orthogonally one of your Anubis, Pyramid or Scarab (Sphinx/Pharaoh cannot move)
    const moveablePieces = getMoveablePieces();
    for (const piece of moveablePieces) {
        const adjacent = getAdjacentCells(piece.cell);
        for (const destCell of adjacent) {
            // Cannot move to a cell where another piece is already placed
            if (board[destCell] === null) {
                actions.push({
                    action: 'MOVE',
                    cell: piece.cell,
                    result: destCell
                });
            }
        }
    }

    // 2. ROTATE actions
    // Rotate 90 degrees one of your Sphinx, Anubis, Scarab or Pyramid (Pharaoh cannot rotate)
    const rotateablePieces = getRotateablePieces();
    for (const piece of rotateablePieces) {
        actions.push({ action: 'ROTATE', cell: piece.cell, result: 'CLOCKWISE' });
        actions.push({ action: 'ROTATE', cell: piece.cell, result: 'ANTICLOCKWISE' });
    }

    // 3. PLACE actions
    // Place a Pyramid from your reserve box
    // Not adjacent to your Pharaoh or any Sphinx
    if (myReserve > 0) {
        for (let i = 0; i < board.length; i++) {
            if (board[i] === null) {
                if (!isAdjacentToRestricted(i, botId)) {
                    // Standard orientations: 0, 90, 180, 270 (North, East, South, West)
                    [0, 90, 180, 270].forEach(orient => {
                        actions.push({
                            action: 'PLACE',
                            cell: -1, // Convention for reserve
                            result: { destination: i, orientation: orient }
                        });
                    });
                }
            }
        }
    }

    // 4. EXCHANGE actions
    // Change your Scarab's position with your Sphinx or your Pharaoh
    // Each swap target has its own independent cooldown: 4 player's turns
    const myScarab = myPieces.find(p => p.type === 'scarab');
    const mySphinx = myPieces.find(p => p.type === 'sphinx');
    const myPharaoh = myPieces.find(p => p.type === 'pharaoh');

    if (myScarab) {
        // Swap with Sphinx
        if (mySphinx && myCooldowns.sphinx === 0) {
            actions.push({
                action: 'EXCHANGE',
                cell: myScarab.cell,
                result: mySphinx.cell
            });
        }
        // Swap with Pharaoh
        if (myPharaoh && myCooldowns.pharaoh === 0) {
            actions.push({
                action: 'EXCHANGE',
                cell: myScarab.cell,
                result: myPharaoh.cell
            });
        }
    }

    return actions;
}

// Simple random move selection
function selectRandomAction(actions) {
    if (actions.length === 0) return null;
    const index = Math.floor(Math.random() * actions.length);
    return actions[index];
}

function setup(initialPositions, isFirstPlayer) {
    botId = isFirstPlayer ? 1 : 2;
    opponentId = isFirstPlayer ? 2 : 1;

    initBoard(initialPositions, isFirstPlayer);

    return Promise.resolve(true);
}

function nextMove(opponentAction) {
    return new Promise((resolve) => {
        // Apply opponent's action to our board state
        applyAction(opponentAction, opponentId);

        // Get all possible actions
        const possibleActions = getAllPossibleActions();

        // Select a random action
        const selectedAction = selectRandomAction(possibleActions);

        // Apply our own action
        if (selectedAction) {
            applyAction(selectedAction, botId);
        }

        resolve(selectedAction);
    });
}

export { setup, nextMove };