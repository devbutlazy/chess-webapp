from typing import Dict

import chess
import chess.engine
from fastapi import APIRouter, HTTPException

from core.api.schemas.schemas import ChessGameForm, MoveForm
from core.config.config import settings

router = APIRouter()

DIFFICULTY_PRESETS: Dict[str, dict] = {
    "easy": {"skill": 1, "depth": 8, "time": 0.1},
    "medium": {"skill": 10, "depth": 12, "time": 0.3},
    "hard": {"skill": 15, "depth": 18, "time": 0.7},
    "impossible": {"skill": 20, "depth": None, "time": 1.0},
}

games: Dict[int, dict] = {}


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

        if data.color == "random":
            import random

            player_color = random.choice(["white", "black"])
        else:
            player_color = data.color

        games[data.user_id] = {
            "board": board,
            "engine": engine,
            "preset": preset,
            "player_color": player_color,
        }

        bot_move = None

        if player_color == "black":
            if preset["depth"]:
                result = await engine.play(
                    board, chess.engine.Limit(depth=preset["depth"])
                )
            else:
                result = await engine.play(
                    board, chess.engine.Limit(time=preset["time"])
                )
            bot_move = result.move
            board.push(bot_move)

        return {
            "success": True,
            "message": f"Game started vs bot ({data.difficulty})",
            "fen": board.fen(),
            "turn": "white" if board.turn == chess.WHITE else "black",
            "player_color": player_color,
            "bot_move": bot_move.uci() if bot_move else None,
        }

    raise HTTPException(400, detail="User vs User not implemented yet")


@router.post("/make_move/")
async def make_move(data: MoveForm) -> dict:
    game = games.get(data.user_id)
    if not game:
        raise HTTPException(status_code=404, detail="No active game found")

    board: chess.Board = game["board"]
    engine: chess.engine.SimpleEngine = game["engine"]
    preset: dict = game["preset"]

    if board.is_game_over():
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
        return {
            "success": True,
            "fen": board.fen(),
            "game_over": True,
            "result": board.result(),
            "reason": board.outcome().termination.name if board.outcome() else None,
            "bot_move": None,
        }

    limit = (
        chess.engine.Limit(depth=preset["depth"])
        if preset.get("depth")
        else chess.engine.Limit(time=preset.get("time"))
    )
    result = await engine.play(board, limit)

    bot_move = result.move
    board.push(bot_move)

    return {
        "success": True,
        "fen": board.fen(),
        "bot_move": bot_move.uci(),
        "game_over": board.is_game_over(),
        "result": board.result() if board.is_game_over() else None,
        "reason": board.outcome().termination.name if board.outcome() else None,
    }
