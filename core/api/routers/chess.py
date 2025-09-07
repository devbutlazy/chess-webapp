from typing import Dict

import chess
import chess.engine
from fastapi import APIRouter, HTTPException

from core.api.schemas.schemas import ChessGameForm, MoveForm

router = APIRouter()

STOCKFISH_PATH = "stockfish/stockfish-windows-x86-64-avx2.exe"

DIFFICULTY_PRESETS: Dict[str, dict] = {
    "easy": {"skill": 1, "depth": 8, "time": 0.1},
    "medium": {"skill": 10, "depth": 12, "time": 0.3},
    "hard": {"skill": 15, "depth": 18, "time": 0.7},
    "impossible": {"skill": 20, "depth": None, "time": 1.0},
}

games: Dict[int, dict] = {}


@router.post("/start_game/")
async def start_game(data: ChessGameForm) -> dict:
    if data.mode == "bot":
        if not data.difficulty:
            raise HTTPException(400, detail="Difficulty required for bot mode")

        preset = DIFFICULTY_PRESETS[data.difficulty]
        board = chess.Board()

        _, engine = await chess.engine.popen_uci(STOCKFISH_PATH)
        await engine.configure({"Skill Level": preset["skill"]})
        games[data.user_id] = {"board": board, "engine": engine, "preset": preset}

        return {
            "success": True,
            "message": f"Game started vs bot ({data.difficulty})",
            "fen": board.fen(),
            "turn": "white",
        }

    raise HTTPException(400, detail="User vs User not implemented yet")


@router.post("/make_move/")
async def make_move(data: MoveForm) -> dict:
    game = games.get(data.user_id)

    if not game:
        raise HTTPException(404, detail="No active game found")

    board: chess.Board = game["board"]
    engine: chess.engine.SimpleEngine = game["engine"]
    preset: dict = game["preset"]

    if board.is_game_over():
        return {"success": False, "message": "Game already over", "fen": board.fen()}
    try:
        move = board.parse_san(data.move)
    except ValueError:
        try:
            move = board.parse_uci(data.move)
        except ValueError:
            raise HTTPException(400, detail="Invalid move format")

    if move not in board.legal_moves:
        raise HTTPException(400, detail="Illegal move")

    board.push(move)
    if board.is_game_over():
        return {"success": True, "fen": board.fen(), "winner": board.result()}

    if preset["depth"]:
        result = await engine.play(board, chess.engine.Limit(depth=preset["depth"]))
    else:
        result = await engine.play(board, chess.engine.Limit(time=preset["time"]))

    bot_move = result.move
    board.push(bot_move)

    return {
        "success": True,
        "fen": board.fen(),
        "bot_move": bot_move.uci(),
        "game_over": board.is_game_over(),
        "result": board.result() if board.is_game_over() else None,
    }
