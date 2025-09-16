const userId = Number(localStorage.getItem("user_id"));
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

const moveSound = new Audio("/assets/sounds/move-self.mp3");
const playMoveSound = () => moveSound.play().catch(() => { moveSound.currentTime = 0; });

async function startNewGame() {
    localStorage.removeItem("game_id");
    const resp = await fetch("/start_game/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, mode: "bot", difficulty: currentDifficulty, color: playerColor })
    });
    const data = await resp.json();
    if (!data.success) return alert("Could not start game: " + (data.detail || data.message));

    gameId = String(data.game_id);
    localStorage.setItem("game_id", gameId);
    setupBoard(data);
}

async function loadGameById(id) {
    const resp = await fetch("/load_game/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: id })
    });
    const data = await resp.json();
    if (!data.success) return alert("Could not load game: " + (data.detail || data.message));

    gameId = String(data.game_id);
    localStorage.setItem("game_id", gameId);
    currentDifficulty = data.difficulty;
    playerColor = data.player_color;
    setupBoard(data);
}

function setupBoard(data) {
    game.load(data.fen || game.fen());
    board = Chessboard("chessboard", { position: game.fen(), orientation: playerColor, draggable: false, pieceTheme: "/assets/chesspieces/{piece}.png" });

    if (data.bot_move) setTimeout(() => {
        game.load(data.fen);
        board.position(data.fen);
        highlightCheck();
        playMoveSound();
        console.log("Bot played:", data.bot_move);
    }, 600);
}

function removeHighlights() {
    document.querySelectorAll("#chessboard .square-55d63").forEach(sq => sq.classList.remove("highlight-square", "highlight-move", "highlight-capture", "selected-square", "king-in-check"));
}

function highlightCheck() {
    removeHighlights();
    if (!game.in_check()) return;

    const turn = game.turn();
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
    for (let rank = 1; rank <= 8; rank++) {
        for (let file of files) {
            const square = file + rank;
            const piece = game.get(square);
            if (piece?.type === "k" && piece.color === turn) document.querySelector(`#chessboard .square-${square}`)?.classList.add("king-in-check");
        }
    }
}

function highlightMoves(square) {
    const moves = game.moves({ square, verbose: true });
    if (!moves.length) return;
    document.querySelector(`#chessboard .square-${square}`)?.classList.add("highlight-square");

    moves.forEach(m => {
        const target = document.querySelector(`#chessboard .square-${m.to}`);
        if (!target) return;
        target.classList.add(m.flags.includes("c") ? "highlight-capture" : "highlight-move");
    });
}

async function handleSquareClick(square) {
    const piece = game.get(square);
    if (!selectedSquare) {
        if (!piece || (game.turn() !== piece.color)) return;
        selectedSquare = square;
        removeHighlights();
        document.querySelector(`#chessboard .square-${square}`)?.classList.add("selected-square");
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

    if (piece?.type === "p" && ((piece.color === "w" && square.endsWith("8")) || (piece.color === "b" && square.endsWith("1")))) {
        showPromotionModal(selectedSquare, square, piece.color);
        return;
    }

    makeMove(selectedSquare, square, "q");
}

function showPromotionModal(from, to, color) {
    const modal = document.getElementById("promotionModal");
    modal.classList.remove("hidden");

    modal.querySelectorAll(".promotion-piece").forEach(img => {
        const type = img.dataset.piece;
        img.src = `/assets/chesspieces/${color}${type.toUpperCase()}.png`;
        img.onclick = () => {
            modal.classList.add("hidden");
            makeMove(from, to, type);
        };
    });
}

function makeMove(from, to, promotion) {
    const move = game.move({ from, to, promotion });
    if (!move) { selectedSquare = null; removeHighlights(); highlightCheck(); return; }

    board.position(game.fen());
    selectedSquare = null;
    removeHighlights();
    highlightCheck();
    playMoveSound();
    sendMoveToServer(move);
}

async function sendMoveToServer(move) {
    try {
        const resp = await fetch("/make_move/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ game_id: gameId, move: move.san }) });
        const data = await resp.json();
        if (!data.success) { game.undo(); board.position(game.fen()); highlightCheck(); return alert("Move rejected: " + (data.detail || data.message)); }

        setTimeout(() => {
            game.load(data.fen);
            board.position(data.fen);
            highlightCheck();
            playMoveSound();

            if (data.bot_move) console.log("Bot played:", data.bot_move);
            if (data.game_over) {
                let msg = data.result === "1-0" ? (playerColor === "white" ? "You win! 🎉" : "You lose. ❌") :
                    data.result === "0-1" ? (playerColor === "black" ? "You win! 🎉" : "You lose. ❌") :
                        "Draw 🤝";
                if (data.reason) msg += ` (${data.reason.replaceAll("_", " ").toLowerCase()})`;
                setTimeout(() => alert(msg), 600);
            }
        }, 500);
    } catch (err) {
        console.error("Server error:", err);
        game.undo();
        board.position(game.fen());
        highlightCheck();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("chessboard").addEventListener("click", e => {
        const square = e.target.dataset.square;
        if (square) handleSquareClick(square);
    });

    if (gameId) loadGameById(gameId);
    else startNewGame();
});
