import random
import chess
from fastapi import APIRouter, HTTPException

from backend.api.schemas.game import ChessGameRequest, ChessGameResponse
from backend.api.schemas.move import (
    MoveRequest,
    MoveResponse,
    LoadGameRequest,
    LoadGameResponse,
    ActiveGameResponse,
)
from backend.services.engine import GameEngine
from backend.database.repositories.chess import ChessGameRepository

router = APIRouter(prefix="/chess/bot", tags=["Chess against Stockfish"])

@router.post("/start", response_model=ChessGameResponse)
async def start_game(data: ChessGameRequest):
    if data.mode != "bot":
        raise HTTPException(400, detail="Only bot mode is supported here")

    if not data.difficulty:
        raise HTTPException(400, detail="Difficulty required for bot mode")

    player_color = (
        data.color if data.color != "random" else random.choice(["white", "black"])
    )

    async with ChessGameRepository() as repo:
        game = await repo.create_game(
            user_id=data.user_id,
            fen=chess.STARTING_FEN,
            player_color=player_color,
            difficulty=data.difficulty,
        )

    board = await GameEngine.get_board(game.game_id, chess.STARTING_FEN)
    bot_move = None

    if player_color == "black":
        bot_move = await GameEngine.play_move(game.game_id, data.difficulty)
        async with ChessGameRepository() as repo:
            await repo.update_fen(game.game_id, board.fen())

    return ChessGameResponse(
        success=True,
        message=f"Game started vs bot ({data.difficulty})",
        game_id=game.game_id,
        fen=board.fen(),
        turn="white" if board.turn == chess.WHITE else "black",
        player_color=player_color,
        difficulty=data.difficulty,
        bot_move=bot_move,
    )


@router.post("/move", response_model=MoveResponse)
async def make_move(data: MoveRequest):
    async with ChessGameRepository() as repo:
        game = await repo.get_game(data.game_id)

    if not game or not game.is_active:
        raise HTTPException(404, detail="No active game found")

    board = await GameEngine.get_board(game.game_id, game.fen)

    move = GameEngine.parse_move(data.move, board)
    if move not in board.legal_moves:
        raise HTTPException(400, detail="Illegal move")

    board.push(move)

    if board.is_game_over(claim_draw=True):
        return await _finalize_game(game.game_id, board, bot_move=None)

    bot_move = await GameEngine.play_move(game.game_id, game.difficulty)

    if board.is_game_over(claim_draw=True):
        return await _finalize_game(game.game_id, board, bot_move=bot_move)

    async with ChessGameRepository() as repo:
        await repo.update_fen(game.game_id, board.fen())

    return MoveResponse(
        success=True,
        fen=board.fen(),
        bot_move=bot_move,
        game_over=False,
    )


@router.get("/active", response_model=list[ActiveGameResponse])
async def get_active_games(user_id: int):
    async with ChessGameRepository() as repo:
        games = await repo.get_active_games(user_id)

    return [
        ActiveGameResponse(
            game_id=g.game_id,
            fen=g.fen,
            player_color=g.player_color,
            difficulty=g.difficulty,
            last_played=g.updated_at,
        )
        for g in games
    ]


@router.post("/load", response_model=LoadGameResponse)
async def load_game(data: LoadGameRequest):
    async with ChessGameRepository() as repo:
        game = await repo.get_game(data.game_id)

    if not game or not game.is_active:
        raise HTTPException(404, detail="Game not found or inactive")

    return LoadGameResponse(
        success=True,
        game_id=game.game_id,
        fen=game.fen,
        player_color=game.player_color,
        difficulty=game.difficulty,
    )


async def _finalize_game(game_id: str, board: chess.Board, bot_move: str | None):
    async with ChessGameRepository() as repo:
        await repo.update_fen(game_id, board.fen())
        await repo.deactivate_game(game_id)

    await GameEngine.cleanup_game(game_id)

    outcome = board.outcome()
    return MoveResponse(
        success=True,
        fen=board.fen(),
        bot_move=bot_move,
        game_over=True,
        result=board.result(),
        reason=outcome.termination.name if outcome else None,
    )
