var game = new Chess();

var board = Chessboard('chessboard', {
    position: 'start',
    draggable: true,
    pieceTheme: '/assets/chesspieces/{piece}.png',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    onMouseoverSquare: onMouseoverSquare,
    onMouseoutSquare: onMouseoutSquare
});

function removeHighlights() {
    $('#chessboard .square-55d63').removeClass('highlight-square highlight-move highlight-capture');
}

function onDragStart(source, piece, position, orientation) {
    if (game.game_over()) return false;
    if ((game.turn() === 'w' && piece.startsWith('b')) ||
        (game.turn() === 'b' && piece.startsWith('w'))) {
        return false;
    }

    removeHighlights();
    highlightMoves(source);
}

function onDrop(source, target) {
    removeHighlights();

    var move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    if (move === null) return 'snapback';
}

function onSnapEnd() {
    board.position(game.fen());
}

function onMouseoverSquare(square, piece) {
    highlightMoves(square);
}

function onMouseoutSquare(square, piece) {
    removeHighlights();
}

function highlightMoves(square) {
    var moves = game.moves({ square: square, verbose: true });
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
