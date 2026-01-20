import { createBoard, initGamePieces, displayBoard } from "./functions/game-functions.js";
import { Player, Pharaoh, Anubis } from "./classes/game-classes.js";
import { rotatePieceClockwise, rotatePieceCounterClockwise, movePiece, possibleMoves, shootLaser, checkGameOver, getPossibleReservePlacements, placePyramid } from "./functions/game-actions-functions.js";


function initializeBoard(player1, player2) {
    let board = createBoard();
    initGamePieces(board, player1, player2);
    return board;
}

function retreivePlayerInfoGUI() {
    let playerInfoGUI = [];
    let player1Reserve = document.querySelector("#player1-reserve")
    let player1Cooldown = document.querySelector("#player1-cooldown")
    let player1Killed = document.querySelector("#player1-killed")
    let player2Reserve = document.querySelector("#player2-reserve");
    let player2Cooldown = document.querySelector("#player2-cooldown");
    let player2Killed = document.querySelector("#player2-killed");
    let player1Info = {
        reserve: player1Reserve,
        cooldown: player1Cooldown,
        killed: player1Killed
    };
    let player2Info = {
        reserve: player2Reserve,
        cooldown: player2Cooldown,
        killed: player2Killed
    };
    playerInfoGUI.push(player1Info);
    playerInfoGUI.push(player2Info);
    return playerInfoGUI;
}

function initPlayerInfoGUI(player_info_gui, pyramid_count) {
    for (let i = 0; i < 2; i++) {
        player_info_gui[i].reserve.setAttribute("count", pyramid_count);
        player_info_gui[i].cooldown.setAttribute("count", 0);
        player_info_gui[i].killed.setAttribute("count", 0);
    }
}

function updatePlayerInfoGUI(player_info_gui, player1, player2) {
    player_info_gui[0].reserve.setAttribute("count", player1.pyramid_count);
    player_info_gui[0].cooldown.setAttribute("count", player1.pyramid_cooldown.length);
    player_info_gui[0].killed.setAttribute("count", player1.killed_anubis);
    player_info_gui[1].reserve.setAttribute("count", player2.pyramid_count);
    player_info_gui[1].cooldown.setAttribute("count", player2.pyramid_cooldown.length);
    player_info_gui[1].killed.setAttribute("count", player2.killed_anubis);
}

document.addEventListener("DOMContentLoaded", () => {
    const board_gui = document.querySelector("#game-board");
    const player_info_gui = retreivePlayerInfoGUI();
    const player1 = new Player(1, "Player 1");
    const player2 = new Player(2, "Player 2");
    const board = initializeBoard(player1, player2);
    initPlayerInfoGUI(player_info_gui, player1.pyramid_count);
    displayBoard(board);
    startGameLoop(board_gui, board, player1, player2, player_info_gui);
});

async function startGameLoop(board_gui, board, player1, player2, player_info_gui) {
    board_gui.setBoard(board);
    let currentPlayer = player1;
    let gameOver = false;
    let turnCount = 0;
    let maxTurns = 100; // Prevent infinite games
    displayMessage(`Player ${currentPlayer.game_id}'s turn`);
    changeTheme(currentPlayer.game_id);
    while (!gameOver && turnCount < maxTurns) {
        // Player's turn - wait for move or rotation or pyramid placement
        await playerTurn(board, board_gui, currentPlayer, player_info_gui[currentPlayer.game_id - 1]);

        // Update board GUI
        board_gui.setPossibleMoves(null);
        board_gui.setBoard(board);

        // Shoot laser and display path
        let laserMap = shootLaser(board, currentPlayer, player1, player2);
        board_gui.displayLaserPath(laserMap, currentPlayer.game_id);

        // Update player pyramid cooldowns and GUI
        updatePlayerCooldowns(player1, player2);
        updatePlayerInfoGUI(player_info_gui, player1, player2);

        // Check for game over condition 
        let winner = checkGameOver(board, player1, player2);
        if (winner) {
            gameOver = true;
            displayMessage(`Game Over! Player ${winner.game_id} wins!`);
            break;
        }

        // Switch players
        currentPlayer = currentPlayer === player1 ? player2 : player1;
        displayMessage(`Player ${currentPlayer.game_id}'s turn`);
        changeTheme(currentPlayer.game_id);
        turnCount++;
    }
}

function updatePlayerCooldowns(player1, player2) {
    [player1, player2].forEach(player => {
        for (let i = 0; i < player.pyramid_cooldown.length; i++) {
            player.pyramid_cooldown[i] -= 1;
            if (player.pyramid_cooldown[i] == 0) {
                player.pyramid_cooldown.splice(i, 1);
                player.pyramid_count += 1;
                i--;
            }
        }
    });
}

function waitForUserReserveClick(player_info_gui) {
    return new Promise((resolve) => {
        const reserveSlot = player_info_gui.reserve;
        const handleClick = () => {
            reserveSlot.removeEventListener("click", handleClick);
            resolve();
        }
        reserveSlot.addEventListener("click", handleClick);
    });
}

async function playerTurn(board, board_gui, currentPlayer, player_info_gui) {
    let clickedPiece = null;
    let clickedPiecePosition = null;
    let playerPlayed = false;
    let reserveClicked = false;

    const rotateLeftBtn = document.getElementById("rotate-left-button");
    const rotateRightBtn = document.getElementById("rotate-right-button");

    const waitForRotationClick = () => {
        return new Promise((resolve) => {
            function left() {
                resolve({ type: "rotation", direction: "counterclockwise" });
            }
            function right() {
                resolve({ type: "rotation", direction: "clockwise" });
            }
            rotateLeftBtn.addEventListener("click", left, { once: true });
            rotateRightBtn.addEventListener("click", right, { once: true });
        });
    }

    const onRotateLeft = () => {
        if(clickedPiece) {
            rotatePieceCounterClockwise(clickedPiece);
            board_gui.setBoard(board);
            playerPlayed = true;
        }
    }

    const onRotateRight = () => {
        if(clickedPiece) {
            rotatePieceClockwise(clickedPiece);
            board_gui.setBoard(board);
            playerPlayed = true;
        }
    }

    rotateLeftBtn.addEventListener("click", onRotateLeft);
    rotateRightBtn.addEventListener("click", onRotateRight);
    
    while (!playerPlayed) {
        const result = await Promise.race([
            board_gui.waitForUserClick().then(action => ({ ...action, source: "board" })),
            waitForUserReserveClick(player_info_gui).then(() => ({ type: "reserve" })),
            waitForRotationClick()
        ]);

        if (reserveClicked && result.type === "cell") {
            board_gui.setPossibleMoves(null);
            let placed = placePyramid(board, result.row, result.col, currentPlayer);
            if (placed) {
                playerPlayed = true;
                break;
            }
        }

        switch (result.type) {

            case "reserve":
                if (!reserveClicked) {
                    board_gui.setPossibleMoves(null);
                    clickedPiece = null;
                    clickedPiecePosition = null;
                    let possiblePlacements = getPossibleReservePlacements(board, currentPlayer);
                    board_gui.setPossibleMoves(possiblePlacements);
                    reserveClicked = true;
                }
                break;


            case "cell":
                board_gui.setPossibleMoves(null);
                reserveClicked = false;

                let clickedPieceTMP = board[result.row][result.col];

                if (clickedPieceTMP && clickedPieceTMP.owner === currentPlayer) {
                    let possibleMovesList = possibleMoves(board, currentPlayer, result.row, result.col);
                    board_gui.setPossibleMoves(possibleMovesList);
                    clickedPiece = clickedPieceTMP;
                    clickedPiecePosition = { row: result.row, col: result.col };
                }
                else if (clickedPiece) {
                    playerPlayed = movePiece(board, clickedPiecePosition.row, clickedPiecePosition.col, result.row, result.col);
                }
                break;

            default:
                console.error("Unknown action type:", result.type);
                break;
        }
    }

    rotateLeftBtn.removeEventListener("click", onRotateLeft);
    rotateRightBtn.removeEventListener("click", onRotateRight);
}

function displayMessage(message) {
    let messageBox = document.querySelector("#current-turn")
    messageBox.innerText = message;

}

function changeTheme(playerId) {
    if (playerId === 1) {
        document.querySelector("#current-turn").classList.add("player1-theme");
        document.querySelector("#current-turn").classList.remove("player2-theme");
    } else {
        document.querySelector("#current-turn").classList.remove("player1-theme");
        document.querySelector("#current-turn").classList.add("player2-theme");
    }
}
