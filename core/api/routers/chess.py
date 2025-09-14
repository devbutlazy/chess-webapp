import random

import chess
from fastapi import APIRouter, HTTPException

from core.api.schemas.schemas import ChessGameForm, MoveForm, LoadGameForm
from core.api.engine import GameEngine
from core.database.repositories.chess import ChessGameRepository

router = APIRouter()


@router.post("/start_game/")
async def start_game(data: ChessGameForm) -> dict:
    if data.mode != "bot":
        raise HTTPException(400, detail="User vs User not implemented yet")

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

    return {
        "success": True,
        "message": f"Game started vs bot ({data.difficulty})",
        "fen": board.fen(),
        "turn": "white" if board.turn == chess.WHITE else "black",
        "player_color": player_color,
        "bot_move": bot_move,
        "game_id": game.game_id,
    }


@router.post("/make_move/")
async def make_move(data: MoveForm) -> dict:
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
        async with ChessGameRepository() as repo:
            await repo.update_fen(game.game_id, board.fen())
            await repo.deactivate_game(game.game_id)

        await GameEngine.cleanup_game(game.game_id)
        outcome = board.outcome()

        return {
            "success": True,
            "fen": board.fen(),
            "game_over": True,
            "result": board.result(),
            "reason": outcome.termination.name if outcome else None,
            "bot_move": None,
        }

    bot_move = await GameEngine.play_move(game.game_id, game.difficulty)

    if board.is_game_over(claim_draw=True):
        async with ChessGameRepository() as repo:
            await repo.update_fen(game.game_id, board.fen())
            await repo.deactivate_game(game.game_id)
        await GameEngine.cleanup_game(game.game_id)
        outcome = board.outcome()
        return {
            "success": True,
            "fen": board.fen(),
            "bot_move": bot_move,
            "game_over": True,
            "result": board.result(),
            "reason": outcome.termination.name if outcome else None,
        }

    async with ChessGameRepository() as repo:
        await repo.update_fen(game.game_id, board.fen())

    return {
        "success": True,
        "fen": board.fen(),
        "bot_move": bot_move,
        "game_over": False,
        "result": None,
        "reason": None,
    }


@router.get("/get_active_games/")
async def get_active_games(user_id: int) -> list:
    async with ChessGameRepository() as repo:
        games = await repo.get_active_games(user_id)

    return [
        {
            "game_id": g.game_id,
            "fen": g.fen,
            "player_color": g.player_color,
            "difficulty": g.difficulty,
            "last_played": g.updated_at,
        }
        for g in games
    ]


@router.post("/load_game/")
async def load_game(data: LoadGameForm) -> dict:
    async with ChessGameRepository() as repo:
        game = await repo.get_game(data.game_id)

    if not game or not game.is_active:
        raise HTTPException(404, detail="Game not found or is not active.")

    return {
        "success": True,
        "game_id": game.game_id,
        "fen": game.fen,
        "player_color": game.player_color,
        "difficulty": game.difficulty,
    }
