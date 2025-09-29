from pydantic import BaseModel

from typing import Optional, Literal


class ChessGameRequest(BaseModel):
    user_id: int
    mode: Literal["bot", "user"]
    difficulty: Optional[Literal["easy", "medium", "hard", "impossible"]] = None
    color: Optional[Literal["white", "black", "random"]] = "white"
    duration: Optional[Literal[1, 3, 5, 10]] = 5


class ChessGameResponse(BaseModel):
    success: bool
    message: str

    game_id: str
    fen: str
    turn: str

    player_color: str
    difficulty: str
    bot_move: Optional[str] = None
