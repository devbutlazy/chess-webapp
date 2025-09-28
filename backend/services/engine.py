from typing import Dict

import chess
from fastapi import HTTPException
from stockfish import Stockfish

from backend.config.config import settings

DIFFICULTY_PRESETS: Dict[str, dict] = {
    "easy": {"skill": 1, "depth": 8, "time": 0.1},
    "medium": {"skill": 10, "depth": 12, "time": 0.3},
    "hard": {"skill": 15, "depth": 18, "time": 0.7},
    "impossible": {"skill": 20, "depth": None, "time": 1.0},
}


class GameEngine:
    _engines: Dict[int, Stockfish] = {}
    _boards: Dict[int, chess.Board] = {}

    @classmethod
    async def get_board(cls, game_id: int, fen: str) -> chess.Board:
        if game_id not in cls._boards:
            cls._boards[game_id] = chess.Board(fen)
        return cls._boards[game_id]

    @classmethod
    async def get_engine(cls, game_id: int, difficulty: str) -> Stockfish:
        if game_id not in cls._engines:
            preset = DIFFICULTY_PRESETS[difficulty]
            engine = Stockfish(
                path=settings.STOCKFISH_PATH,
                depth=preset["depth"] or 15,
                parameters={"Skill Level": preset["skill"]},
            )
            cls._engines[game_id] = engine
        return cls._engines[game_id]

    @classmethod
    async def play_move(cls, game_id: int, difficulty: str) -> str:
        board = cls._boards[game_id]

        engine = await cls.get_engine(game_id, difficulty)
        engine.set_fen_position(board.fen())

        move = engine.get_best_move()
        board.push_uci(move)

        return move

    @classmethod
    async def cleanup_game(cls, game_id: int):
        cls._engines.pop(game_id, None)
        cls._boards.pop(game_id, None)

    @staticmethod
    def parse_move(move_str: str, board: chess.Board) -> chess.Move:
        parsers = (board.parse_san, board.parse_uci)
        for parser in parsers:
            try:
                return parser(move_str)
            except ValueError:
                continue

        raise HTTPException(status_code=400, detail="Invalid move format")
