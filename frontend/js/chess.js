const userId = window.localStorage.getItem("user_id") || Math.floor(Math.random() * 1000000);
window.localStorage.setItem("user_id", userId);

let currentDifficulty = window.localStorage.getItem("difficulty") || "medium";
let playerColor = window.localStorage.getItem("color") || "white";

if (playerColor === "random") {
    playerColor = Math.random() > 0.5 ? "white" : "black";
    localStorage.setItem("color", playerColor);
}

let game = new Chess();
let board = null;
let selectedSquare = null;

async function startGame() {
    const resp = await fetch("/start_game/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: parseInt(userId),
            mode: "bot",
            difficulty: currentDifficulty,
            color: playerColor
        }),
    });

    const data = await resp.json();
    if (!data.success) {
        alert("Could not start game: " + (data.detail || data.message));
        return;
    }

    game.reset();

    board = Chessboard('chessboard', {
        position: game.fen(),
        orientation: playerColor,
        draggable: false,
        pieceTheme: '/assets/chesspieces/{piece}.png'
    });

    if (data.bot_move) {
        setTimeout(() => {
            game.load(data.fen);
            board.position(data.fen);
            console.log("Bot played:", data.bot_move);
        }, 600); 
    }
}


function removeHighlights() {
    $('#chessboard .square-55d63').removeClass('highlight-square highlight-move highlight-capture selected-square');
}

async function handleSquareClick(square) {
    if (!selectedSquare) {
        const piece = game.get(square);
        if (!piece) return;
        if ((game.turn() === 'w' && piece.color === 'b') || (game.turn() === 'b' && piece.color === 'w')) return;

        selectedSquare = square;
        removeHighlights();
        $('#chessboard .square-' + square).addClass('selected-square');
        highlightMoves(square);
        return;
    }

    if (selectedSquare === square) {
        selectedSquare = null;
        removeHighlights();
        return;
    }

    const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
    if (move === null) {
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
            selectedSquare = square;
            removeHighlights();
            $('#chessboard .square-' + square).addClass('selected-square');
            highlightMoves(square);
        }
        return;
    }

    board.position(game.fen());
    selectedSquare = null;
    removeHighlights();

    try {
        const resp = await fetch("/make_move/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: parseInt(userId),
                move: move.san
            }),
        });

        const data = await resp.json();

        if (!data.success) {
            alert("Move rejected: " + (data.detail || data.message));
            game.undo();
            board.position(game.fen());
            return;
        }

        setTimeout(() => {
            game.load(data.fen);
            board.position(data.fen);

            if (data.bot_move) {
                console.log("Bot played:", data.bot_move);
            }

            if (data.game_over) {
                alert("Game over! Result: " + data.result);
            }
        }, 500);
    } catch (err) {
        console.error("Server error:", err);
        game.undo();
        board.position(game.fen());
    }
}

function highlightMoves(square) {
    const moves = game.moves({ square: square, verbose: true });
    if (moves.length === 0) return;

    $('#chessboard .square-' + square).addClass('highlight-square');

    moves.forEach(function (m) {
        var target = $('#chessboard .square-' + m.to);
        if (m.flags.includes('c')) {
            target.addClass('highlight-capture');
        } else {
            target.addClass('highlight-move');
        }
    });
}

$(document).ready(async function () {
    $('#chessboard').on('click', '.square-55d63', function () {
        const square = $(this).attr('data-square');
        handleSquareClick(square);
    });

    await startGame();
});
