from typing import Dict

import random
import chess
import chess.engine
from fastapi import APIRouter, HTTPException

from core.config.config import settings
from core.api.schemas.schemas import ChessGameForm, MoveForm, LoadGameForm
from core.database.repositories.chess import ChessGameRepository


router = APIRouter()

DIFFICULTY_PRESETS: Dict[str, dict] = {
    "easy": {"skill": 1, "depth": 8, "time": 0.1},
    "medium": {"skill": 10, "depth": 12, "time": 0.3},
    "hard": {"skill": 15, "depth": 18, "time": 0.7},
    "impossible": {"skill": 20, "depth": None, "time": 1.0},
}


def _parse_move(move_str: str, board: chess.Board) -> chess.Move:
    """
    Try parsing the move string as SAN first, then UCI.
    Raise HTTPException if invalid.
    """
    parsers = (board.parse_san, board.parse_uci)
    for parser in parsers:
        try:
            return parser(move_str)
        except ValueError:
            continue
    raise HTTPException(status_code=400, detail="Invalid move format")


@router.post("/start_game/")
async def start_game(data: ChessGameForm) -> dict:
    if data.mode == "bot":
        if not data.difficulty:
            raise HTTPException(400, detail="Difficulty required for bot mode")

        preset = DIFFICULTY_PRESETS[data.difficulty]
        board = chess.Board()

        _, engine = await chess.engine.popen_uci(settings.STOCKFISH_PATH)
        await engine.configure({"Skill Level": preset["skill"]})

        player_color = (
            data.color if data.color != "random" else random.choice(["white", "black"])
        )

        print(f"{data.user_id=}")
        async with ChessGameRepository() as repository:
            game = await repository.create_game(
                user_id=data.user_id,
                fen=board.fen(),
                player_color=player_color,
                difficulty=data.difficulty,
            )

        bot_move = None

        if player_color == "black":
            limit = (
                chess.engine.Limit(depth=preset["depth"])
                if preset["depth"]
                else chess.engine.Limit(time=preset["time"])
            )

            result = await engine.play(board, limit)
            bot_move = result.move
            board.push(bot_move)

            async with ChessGameRepository() as repository:
                await repository.update_fen(game.game_id, board.fen())

        return {
            "success": True,
            "message": f"Game started vs bot ({data.difficulty})",
            "fen": board.fen(),
            "turn": "white" if board.turn == chess.WHITE else "black",
            "player_color": player_color,
            "bot_move": bot_move.uci() if bot_move else None,
            "game_id": game.game_id,
        }

    raise HTTPException(400, detail="User vs User not implemented yet")


@router.post("/make_move/")
async def make_move(data: MoveForm) -> dict:
    async with ChessGameRepository() as repository:
        game = await repository.get_game(data.game_id)
        if not game or not game.is_active:
            raise HTTPException(404, detail="No active game found")

    board = chess.Board(game.fen)
    preset = DIFFICULTY_PRESETS[game.difficulty]

    if board.is_game_over():
        async with ChessGameRepository() as repository:
            await repository.deactivate_game(game.game_id)
        return {
            "success": False,
            "message": "Game already over",
            "fen": board.fen(),
            "result": board.result(),
        }

    move = _parse_move(data.move, board)
    if move not in board.legal_moves:
        raise HTTPException(status_code=400, detail="Illegal move")
    board.push(move)

    if board.is_game_over():
        async with ChessGameRepository() as repository:
            await repository.update_fen(game.game_id, board.fen())
            await repository.deactivate_game(game.game_id)
        return {
            "success": True,
            "fen": board.fen(),
            "game_over": True,
            "result": board.result(),
            "reason": board.outcome().termination.name if board.outcome() else None,
            "bot_move": None,
        }

    _, engine = await chess.engine.popen_uci(settings.STOCKFISH_PATH)
    await engine.configure({"Skill Level": preset["skill"]})

    limit = (
        chess.engine.Limit(depth=preset["depth"])
        if preset.get("depth")
        else chess.engine.Limit(time=preset.get("time"))
    )
    result = await engine.play(board, limit)
    bot_move = result.move
    board.push(bot_move)

    if board.is_game_over():
        async with ChessGameRepository() as repository:
            await repository.update_fen(game.game_id, board.fen())
            await repository.deactivate_game(game.game_id)
        return {
            "success": True,
            "fen": board.fen(),
            "bot_move": bot_move.uci(),
            "game_over": True,
            "result": board.result(),
            "reason": board.outcome().termination.name if board.outcome() else None,
        }

    async with ChessGameRepository() as repository:
        await repository.update_fen(game.game_id, board.fen())

    return {
        "success": True,
        "fen": board.fen(),
        "bot_move": bot_move.uci(),
        "game_over": False,
        "result": None,
        "reason": None,
    }


@router.get("/get_active_games/")
async def get_active_games(user_id: int) -> list:
    async with ChessGameRepository() as repository:
        games = await repository.get_active_games(user_id)

    return [
        {
            "game_id": game.game_id,
            "fen": game.fen,
            "player_color": game.player_color,
            "difficulty": game.difficulty,
            "last_played": game.updated_at,
        }
        for game in games
    ]


@router.post("/load_game/")
async def load_game(data: LoadGameForm) -> dict:
    async with ChessGameRepository() as repository:
        game = await repository.get_game(data.game_id)

    if not game:
        raise HTTPException(404, detail="Game not found")

    return {
        "success": True,
        "game_id": game.game_id,
        "fen": game.fen,
        "player_color": game.player_color,
        "difficulty": game.difficulty,
    }
