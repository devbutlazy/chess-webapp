const userId = localStorage.getItem("user_id");

let gameId = localStorage.getItem("game_id");
let currentDifficulty = localStorage.getItem("difficulty") || "medium";
let playerColor = localStorage.getItem("color") || "white";

if (playerColor === "random") {
    playerColor = Math.random() > 0.5 ? "white" : "black";
    localStorage.setItem("color", playerColor);
}

let game = new Chess();
let board = null;
let selectedSquare = null;

let isPaused = false;
let pendingBotMove = null;

const clickSound = new Audio("/assets/sounds/click.mp3");
clickSound.preload = "auto";

const playClickSound = () => {
    try {
        clickSound.currentTime = 0;
        clickSound.play();
    } catch (err) {
        console.warn("Sound play blocked:", err);
    }
};

const moveSound = new Audio("/assets/sounds/move-self.mp3");
const playMoveSound = () => {
    moveSound.currentTime = 0;
    moveSound.play().catch(() => { });
};

const apiCall = async (endpoint, data) => {
    const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return resp.json();
};

const startNewGame = async () => {
    localStorage.removeItem("game_id");
    const data = await apiCall("/bot/start", {
        user_id: parseInt(userId),
        mode: "bot",
        difficulty: currentDifficulty,
        color: playerColor
    });
    if (!data.success) {
        alert("Could not start game: " + (data.detail || data.message));
        return;
    }
    gameId = String(data.game_id);
    localStorage.setItem("game_id", gameId);
    setupBoard(data);
};

const loadGameById = async (id) => {
    const data = await apiCall("/bot/load", { game_id: id });
    if (!data.success) {
        alert("Could not load game: " + (data.detail || data.message));
        return;
    }
    gameId = String(data.game_id);
    localStorage.setItem("game_id", gameId);
    currentDifficulty = data.difficulty;
    playerColor = data.player_color;
    setupBoard(data);
};

const setupBoard = (data) => {
    game.load(data.fen || game.fen());
    board = Chessboard('chessboard', {
        position: game.fen(),
        orientation: playerColor,
        draggable: false,
        pieceTheme: '/assets/chesspieces/{piece}.png'
    });
    if (data.bot_move) {
        setTimeout(() => {
            if (isPaused) {
                pendingBotMove = data;
                return;
            }
            applyBotMove(data);
        }, 600);
    }
};

const removeHighlights = () => {
    $('#chessboard .square-55d63').removeClass('highlight-square highlight-move highlight-capture selected-square king-in-check');
};

const highlightCheck = () => {
    $('#chessboard .square-55d63').removeClass('king-in-check');
    if (!game.in_check()) return;
    const turn = game.turn();
    for (let rank = 1; rank <= 8; rank++) {
        for (let file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
            const square = file + rank;
            const piece = game.get(square);
            if (piece?.type === 'k' && piece.color === turn) {
                $('#chessboard .square-' + square).addClass('king-in-check');
            }
        }
    }
};

const highlightMoves = (square) => {
    const moves = game.moves({ square, verbose: true });
    if (!moves.length) return;
    $('#chessboard .square-' + square).addClass('highlight-square');
    moves.forEach(m => {
        const target = $('#chessboard .square-' + m.to);
        target.addClass(m.flags.includes('c') ? 'highlight-capture' : 'highlight-move');
    });
};

const handleSquareClick = (square) => {
    if (isPaused) return;
    if (!selectedSquare) {
        const piece = game.get(square);
        if (!piece || (game.turn() === 'w' && piece.color === 'b') || (game.turn() === 'b' && piece.color === 'w')) return;
        selectedSquare = square;
        removeHighlights();
        $('#chessboard .square-' + square).addClass('selected-square');
        highlightMoves(square);
        highlightCheck();
        return;
    }
    if (selectedSquare === square) {
        selectedSquare = null;
        removeHighlights();
        highlightCheck();
        return;
    }
    const piece = game.get(selectedSquare);
    if (piece.type === 'p' && ((piece.color === 'w' && square.endsWith('8')) || (piece.color === 'b' && square.endsWith('1')))) {
        showPromotionModal(selectedSquare, square, piece.color);
        return;
    }
    makeMove(selectedSquare, square, 'q');
};

const showPromotionModal = (from, to, color) => {
    const modal = $('#promotionModal');
    modal.removeClass('hidden');
    modal.find('.promotion-piece').each(function () {
        const pieceType = $(this).data('piece');
        $(this).attr('src', `/assets/chesspieces/${color}${pieceType.toUpperCase()}.png`);
    });
    $('.promotion-piece').off('click').on('click', function () {
        const selectedPromotion = $(this).data('piece');
        modal.addClass('hidden');
        makeMove(from, to, selectedPromotion);
    });
};

const makeMove = (from, to, promotion) => {
    const move = game.move({ from, to, promotion });
    if (!move) {
        selectedSquare = null;
        removeHighlights();
        highlightCheck();
        return;
    }
    board.position(game.fen());
    selectedSquare = null;
    removeHighlights();
    highlightCheck();
    playMoveSound();
    sendMoveToServer(move);
};

const sendMoveToServer = async (move) => {
    try {
        const data = await apiCall("/bot/move", { game_id: gameId, move: move.san });
        setTimeout(() => {
            if (isPaused) {
                pendingBotMove = data;
                return;
            }
            applyBotMove(data);
        }, 500);
    } catch (err) {
        console.error("Server error:", err);
        game.undo();
        board.position(game.fen());
        highlightCheck();
    }
};

const showGameOverModal = (result, reason, difficulty) => {
    const modal = document.getElementById("gameOverModal");
    const title = document.getElementById("gameOverTitle");
    const reasonEl = document.getElementById("gameOverReason");
    const difficultyEl = document.getElementById("gameOverDifficulty");

    modal.classList.remove("hidden");
    modal.classList.remove("gameover-win", "gameover-lose", "gameover-draw");

    let statusClass = "";
    let titleText = "";

    if (result === "1-0") {
        titleText = playerColor === "white" ? "You Won" : "You Lost";
        statusClass = playerColor === "white" ? "gameover-win" : "gameover-lose";
    } else if (result === "0-1") {
        titleText = playerColor === "black" ? "You Won" : "You Lost";
        statusClass = playerColor === "black" ? "gameover-win" : "gameover-lose";
    } else if (result === "1/2-1/2") {
        titleText = "Draw";
        statusClass = "gameover-draw";
    }

    modal.classList.add(statusClass);
    title.textContent = titleText;
    reasonEl.textContent = `Reason: ${reason.replaceAll("_", " ").toLowerCase()}`;
    difficultyEl.textContent = `Difficulty: ${currentDifficulty}`;
};


const applyBotMove = (data) => {
    game.load(data.fen);
    board.position(data.fen);
    highlightCheck();
    playMoveSound();

    if (data.bot_move) console.log("Bot played:", data.bot_move);

    if (data.game_over) {
        setTimeout(() => {
            showGameOverModal(data.result, data.reason || "Unknown", currentDifficulty);
        }, 600);
    }
};

const uiControls = () => {
    const pauseButton = document.getElementById("pauseButton");
    const pauseModal = document.getElementById("pauseModal");
    const resumeGame = document.getElementById("resumeGame");
    const exitButtons = document.querySelectorAll("#pauseMenuExitGame, #gameOverExitGame");
    const animationBtn = document.getElementById("animationSpeed");
    const speeds = ["Fast", "Normal", "Slow"];
    let currentIndex = speeds.indexOf(animationBtn.textContent);

    const toggleEffects = document.getElementById("toggleEffects");

    pauseButton.addEventListener("click", () => {
        playClickSound();
        pauseModal.classList.remove("hidden");
        isPaused = true;
    });

    resumeGame.addEventListener("click", () => {
        playClickSound();
        pauseModal.classList.add("hidden");
        isPaused = false;
        if (pendingBotMove) {
            applyBotMove(pendingBotMove);
            pendingBotMove = null;
        }
    });

    exitButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            playClickSound();
            localStorage.removeItem("game_id");
            window.location.href = "/";
        });
    });

    animationBtn.addEventListener("click", () => {
        playClickSound();
        currentIndex = (currentIndex + 1) % speeds.length;
        animationBtn.textContent = speeds[currentIndex];
        localStorage.setItem("animationSpeed", speeds[currentIndex].toLowerCase());
    });

    toggleEffects.addEventListener("click", () => {
        playClickSound();
        localStorage.setItem("soundEffects", toggleEffects.checked);
    });
};

$(document).ready(() => {
    $('#chessboard').on('click', '.square-55d63', function () {
        handleSquareClick($(this).attr('data-square'));
    });
    uiControls();
    gameId ? loadGameById(gameId) : startNewGame();
});
