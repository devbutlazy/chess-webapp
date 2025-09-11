from pydantic import BaseModel

from typing import Optional, Literal


class ChessGameForm(BaseModel):
    user_id: int
    mode: Literal["bot", "user"]
    difficulty: Optional[Literal["easy", "medium", "hard", "impossible"]] = None
    color: Optional[Literal["white", "black", "random"]] = "white"


class MoveForm(BaseModel):
    game_id: int
    move: str

class LoadGameForm(BaseModel):
    game_id: int
