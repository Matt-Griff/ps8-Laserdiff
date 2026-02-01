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

class Player {
    constructor(id) {
        this.id = id;
        this.cooldowns = { sphinx: 0, pharaoh: 0 };
        this.reserve = INITIAL_PYRAMIDS;
        this.pieces = [];
        this.canShoot = true;
    }
}

let players = [];
let me = null;
let opponent = null;
let currentPlayer = botId;

// Initialize board from initial positions
function initBoard(initialPositions) {
    board = Array.from({ length: 10 }, () =>
        Array.from({ length: 10 }, () => null)
    );

    // Place first player pieces
    const p1 = initialPositions;
    let sphinxCords = cellToCoords(p1.sphinx);
    let pharaohCords = cellToCoords(p1.pharaoh);
    let scarabCords = cellToCoords(p1.scarab.position);

    let anubis1Row = (sphinxCords.row === 0) ? 4 : 5;
    let anubis2row = (sphinxCords.row === 0) ? 2 : 7;
    let orientation1 = (sphinxCords.row === 0) ? 0 : 180;

    const mirrorCord = (coord) => 9 - coord;
    let scarabOrientation = p1.scarab.orientation;
    if (scarabOrientation == 9) {
        scarabOrientation = 90;
    }

    board[sphinxCords.row][sphinxCords.col] = { type: 'sphinx', owner: 1, orientation: orientation1 };
    board[pharaohCords.row][pharaohCords.col] = { type: 'pharaoh', owner: 1 };
    board[scarabCords.row][scarabCords.col] = { type: 'scarab', owner: 1, orientation: scarabOrientation };
    board[anubis1Row][pharaohCords.col] = { type: 'anubis', owner: 1, orientation: orientation1 };
    board[anubis2row][mirrorCord(sphinxCords.col)] = { type: 'anubis', owner: 1, orientation: orientation1 };

    // Place second player pieces symmetrically
    const mirrorOrientation = (orient) => (orient + 180) % 360;

    // Simple 180 mirror
    board[mirrorCord(sphinxCords.row)][mirrorCord(sphinxCords.col)] = { type: 'sphinx', owner: 2, orientation: mirrorOrientation(orientation1) };
    board[mirrorCord(pharaohCords.row)][mirrorCord(pharaohCords.col)] = { type: 'pharaoh', owner: 2 };
    board[mirrorCord(scarabCords.row)][mirrorCord(scarabCords.col)] = { type: 'scarab', owner: 2, orientation: mirrorOrientation(scarabOrientation) };
    board[mirrorCord(anubis1Row)][mirrorCord(pharaohCords.col)] = { type: 'anubis', owner: 2, orientation: mirrorOrientation(orientation1) };
    board[mirrorCord(anubis2row)][sphinxCords.col] = { type: 'anubis', owner: 2, orientation: mirrorOrientation(orientation1) };
    // Track our pieces
    refreshPieces();
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
    0: { dx: 0, dy: 1 },    // Up
    90: { dx: -1, dy: 0 },    // Right
    180: { dx: 0, dy: -1 },   // Down
    270: { dx: 1, dy: 0 }   // Left
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
        const protectedSideMap = { 0: 'down', 90: 'left', 180: 'up', 270: 'right' };
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
    if (piece.type === 'scarab') return true;


    const orientation = piece.orientation;
    const sideToAngle = { 'up': [0, 90], 'right': [90, 99], 'down': [99, 9], 'left': [9, 0] };
    const hitAngles = sideToAngle[hitSide];
    return piece.orientation === hitAngles[0] || piece.orientation === hitAngles[1];
}

// Get new laser direction after reflection
function getReflectedDirection(dx, dy) {
    if (dx === 0 && dy === -1) return { dx: 1, dy: 0 }; // Up to Right
    if (dx === 1 && dy === 0) return { dx: 0, dy: 1 }; // Right to Down
    if (dx === 0 && dy === 1) return { dx: -1, dy: 0 }; // Down to Left
    if (dx === -1 && dy === 0) return { dx: 0, dy: -1 }; // Left to Up
}

// Simulate the laser shooting after a player's turn
function shootLaser(player) {
    // Check if player can shoot
    if (!player.canShoot) return;

    // Find the sphinx of the player who just moved
    let sphinxRow = -1;
    let sphinxCol = -1;
    let sphinxPiece = null;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] && board[i][j].type === 'sphinx' && board[i][j].owner === player.id) {
                sphinxRow = i;
                sphinxCol = j;
                sphinxPiece = board[i][j];
                break;
            }
        }
    }

    // If no sphinx found, 
    if (!sphinxPiece) {
        console.error("Sphinx not found for player", player.id);
        return;
    }

    const startRow = sphinxRow;
    const startCol = sphinxCol;
    let { dx, dy } = orientationToDir[sphinxPiece.orientation];

    let laserRow = startRow + dy;
    let laserCol = startCol + dx;

    while (laserRow >= 0 && laserRow < BOARD_SIZE && laserCol >= 0 && laserCol < BOARD_SIZE) {
        console.log(`AI : Laser at (${laserRow}, ${laserCol})`);
        const targetPiece = board[laserRow][laserCol];

        if (targetPiece) {
            const hitSide = getHitSide(dx, dy);

            // Check if protected
            if (isProtected(targetPiece, hitSide)) {
                console.log(`AI : Laser hit a protected side of ${targetPiece.type} at (${laserRow}, ${laserCol})`);
                break;
            }

            // Check if can reflect
            if (canReflect(targetPiece, hitSide)) {
                console.log(`AI : Laser reflected by ${targetPiece.type} at (${laserRow}, ${laserCol})`);
                const newDir = getReflectedDirection(dx, dy);
                dx = newDir.dx;
                dy = newDir.dy;
            } else {
                // Piece is destroyed and the laser continues
                console.log(`AI : Piece ${targetPiece.type} at (${laserRow}, ${laserCol}) destroyed by laser.`);
                board[laserRow][laserCol] = null;
            }
        }

        laserRow += dy;
        laserCol += dx;
    }

    refreshPieces();
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
function isAdjacentToRestricted(row, col, playerId) {
    const adjacent = getAdjacentCells(coordsToCell(row, col));
    for (const adjCell of adjacent) {
        const { row: adjRow, col: adjCol } = cellToCoords(adjCell);
        const piece = board[adjRow][adjCol];
        if (piece) {
            if (piece.type === 'sphinx') return true;
            if (piece.type === 'pharaoh' && piece.owner === playerId) return true;
        }
    }
    return false;
}


// Refresh the myPieces array
function refreshPieces() {
    players[1].pieces = [];
    players[2].pieces = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j]) {
                players[board[i][j].owner].pieces.push({
                    type: board[i][j].type,
                    cell: coordsToCell(i, j),
                    orientation: board[i][j].orientation || 0
                });
            }
        }
    }
}

// Apply an action to our internal board state
function applyAction(action, player) {
    // Decrement cooldowns
    if (player.cooldowns.sphinx > 0) player.cooldowns.sphinx--;
    if (player.cooldowns.pharaoh > 0) player.cooldowns.pharaoh--;
    player.canShoot = true;

    if (action.action === "N/A") {
        // No action taken
        console.error("No action taken by player", player.id);
        return;
    }

    if (!action) {
        // Even if no action, laser still shoots
        shootLaser(player);
        return;
    }

    const { action: actionType, cell: cell, result: result } = action;
    const { row, col } = cellToCoords(cell);

    switch (actionType) {
        case 'MOVE':
            if (board[row][col]) {
                const { row: resultRow, col: resultCol } = cellToCoords(result);
                board[resultRow][resultCol] = board[row][col];
                board[row][col] = null;
            }
            break;
        case 'ROTATE':
            if (board[row][col]) {
                const piece = board[row][col];
                if (result === 'CW') { //TODO: Fix rotation Pyramid / Scarab
                    piece.orientation = ((piece.orientation || 0) + 270) % 360;
                } else {
                    piece.orientation = ((piece.orientation || 0) + 90) % 360;
                }
            }
            break;
        case 'PLACE':
            const { row: placeRow, col: placeCol } = cellToCoords(result.destination);
            board[placeRow][placeCol] = {
                type: 'pyramid',
                owner: player.id,
                orientation: result.orientation
            };
            player.reserve--;
            console.log(`AI: PLACED`);
            break;
        case 'EXCHANGE':
            const { row: cellRow, col: cellCol } = cellToCoords(cell);
            const { row: resultRow, col: resultCol } = cellToCoords(result);
            if (board[cellRow][cellCol] && board[resultRow][resultCol]) {
                const temp = board[cellRow][cellCol];
                board[cellRow][cellCol] = board[resultRow][resultCol];
                board[resultRow][resultCol] = temp;

                // Set cooldown if we are the ones swapping
                // One of the pieces involved is the Scarab, the other is Sphinx or Pharaoh
                // We check both involved pieces to determine which cooldown to activate
                const piece1 = board[cellRow][cellCol];
                const piece2 = board[resultRow][resultCol];

                if (piece1.type === 'sphinx' || piece2.type === 'sphinx') {
                    player.cooldowns.sphinx = SWAP_COOLDOWN;
                }
                if (piece1.type === 'pharaoh' || piece2.type === 'pharaoh') {
                    player.cooldowns.pharaoh = SWAP_COOLDOWN;
                }
                player.canShoot = false;
            }
            break;
    }
    // Shoot laser after action
    shootLaser(player);

    refreshPieces();
}

// Find all moveable pieces (Anubis, Pyramid, Scarab)
function getMoveablePieces(player) {
    return player.pieces.filter(p => p.type !== 'sphinx' && p.type !== 'pharaoh');
}

// Find all rotateable pieces (Sphinx, Anubis, Scarab, Pyramid)
function getRotateablePieces(player) {
    return player.pieces.filter(p => ['sphinx', 'anubis', 'scarab', 'pyramid'].includes(p.type));
}

// Generate all possible actions
function getAllPossibleActions(player) {
    const actions = [];

    // 1. MOVE actions
    // Move orthogonally one of your Anubis, Pyramid or Scarab (Sphinx/Pharaoh cannot move)
    const moveablePieces = getMoveablePieces(player);
    for (const piece of moveablePieces) {
        const adjacent = getAdjacentCells(piece.cell);
        for (const destCell of adjacent) {
            // Cannot move to a cell where another piece is already placed
            let { row: destRow, col: destCol } = cellToCoords(destCell);
            if (board[destRow][destCol] === null) {
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
    const rotateablePieces = getRotateablePieces(player);
    for (const piece of rotateablePieces) {
        actions.push({ action: 'ROTATE', cell: piece.cell, result: 'CW' });
        actions.push({ action: 'ROTATE', cell: piece.cell, result: 'CCW' });
    }

    // 3. PLACE actions
    // Place a Pyramid from your reserve box
    // Not adjacent to your Pharaoh or any Sphinx
    if (player.reserve > 0) {
        for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (board[i][j] === null) {
                    if (!isAdjacentToRestricted(i, j, botId)) {
                        // Standard orientations: 0, 90, 180, 270 (North, East, South, West)
                        [0, 90, 9, 99].forEach(orient => {
                            actions.push({
                                action: 'PLACE',
                                cell: -1, // Convention for reserve
                                result: { destination: coordsToCell(i, j), orientation: orient }
                            });
                        });
                    }
                }
            }
        }
    }

    // 4. EXCHANGE actions
    // Change your Scarab's position with your Sphinx or your Pharaoh
    // Each swap target has its own independent cooldown: 4 player's turns
    const myScarab = player.pieces.find(p => p.type === 'scarab');
    const mySphinx = player.pieces.find(p => p.type === 'sphinx');
    const myPharaoh = player.pieces.find(p => p.type === 'pharaoh');

    if (myScarab) {
        // Swap with Sphinx
        if (mySphinx && player.cooldowns.sphinx === 0) {
            actions.push({
                action: 'EXCHANGE',
                cell: myScarab.cell,
                result: mySphinx.cell
            });
        }
        // Swap with Pharaoh
        if (myPharaoh && player.cooldowns.pharaoh === 0) {
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
    return new Promise((resolve) => {
        botId = isFirstPlayer ? 1 : 2;
        opponentId = isFirstPlayer ? 2 : 1;

        players[botId] = new Player(botId);
        players[opponentId] = new Player(opponentId);
        me = players[botId];
        opponent = players[opponentId];

        initBoard(initialPositions, isFirstPlayer);
        resolve("AI setup completed.");
    });
}

function nextMove(opponentAction) {
    console.log("Received opponent action:", opponentAction);
    displayBoard(board);
    return new Promise((resolve) => {
        // Apply opponent's action to our board state
        applyAction(opponentAction, opponent);
        displayBoard(board);

        // Get all possible actions
        const possibleActions = getAllPossibleActions(me);

        // Select a random action
        const selectedAction = selectRandomAction(possibleActions);

        // Apply our own action
        if (selectedAction) {
            applyAction(selectedAction, me);
        }

        resolve(selectedAction);
        displayBoard(board);
    });
}

const orientationNames = {
    0: "S",
    90: "E",
    180: "N",
    270: "W"
};

const pieceAbbr = {
    sphinx: 'SP',
    pharaoh: 'PH',
    scarab: 'SC',
    anubis: 'AN',
    pyramid: 'PY'
};

const displayBoard = (board) => {
    console.log("--- Board ---");
    for (let row = 0; row < BOARD_SIZE; row++) {
        let rowString = "";
        let styleArr = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            const pawn = board[row][col];
            if (pawn) {
                let abbr = pieceAbbr[pawn.type] || pawn.type.substring(0, 2).toUpperCase();
                let pawnStr = abbr + '-';
                if (pawn.type === 'pyramid') {
                    pawnStr += pawn.orientation;
                }
                else if (pawn.orientation !== undefined) {
                    pawnStr += orientationNames[pawn.orientation];
                }
                let color = pawn.owner === 1 ? 'color: #2196f3' : 'color: #e53935';
                rowString += `%c${pawnStr} `;
                styleArr.push(color);
            } else {
                rowString += '%c .  ';
                styleArr.push('color: #888');
            }
        }
        console.log(rowString, ...styleArr);
    }
}

export { setup, nextMove };