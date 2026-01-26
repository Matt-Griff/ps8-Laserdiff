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
let board = [];
let myPieces = [];
// Cooldowns and reserve state
let myReserve = INITIAL_PYRAMIDS;
let myCooldowns = {
    sphinx: 0,
    pharaoh: 0
};

// Convert cell number to row/col
function cellToCoords(cell) {
    return { row: Math.floor(cell / 10), col: cell % 10 };
}

// Convert row/col to cell number
function coordsToCell(row, col) {
    return row * 10 + col;
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

// Initialize board from initial positions
function initBoard(initialPositions) {
    board = [];
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
        board[i] = null;
    }
    myPieces = [];
    myReserve = INITIAL_PYRAMIDS;
    myCooldowns = { sphinx: 0, pharaoh: 0 };

    // Place first player pieces
    const p1 = initialPositions;
    board[p1.sphinx] = { type: 'sphinx', owner: 1, orientation: 0 };
    board[p1.pharaoh] = { type: 'pharaoh', owner: 1 };
    board[p1.scarab.position] = { type: 'scarab', owner: 1, orientation: p1.scarab.orientation };

    // Place second player pieces symmetrically
    const mirrorCell = (cell) => (BOARD_SIZE * BOARD_SIZE - 1) - cell;
    
    // Simple 180 mirror
    board[mirrorCell(p1.sphinx)] = { type: 'sphinx', owner: 2, orientation: 180 };
    board[mirrorCell(p1.pharaoh)] = { type: 'pharaoh', owner: 2 };
    board[mirrorCell(p1.scarab.position)] = { type: 'scarab', owner: 2, orientation: p1.scarab.orientation };

    // Track our pieces
    refreshMyPieces();
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

    if (!action) return;

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

exports.setup = setup;
exports.nextMove = nextMove;
