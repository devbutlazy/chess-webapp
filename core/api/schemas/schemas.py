from pydantic import BaseModel

from typing import Optional, Literal


class ChessGameForm(BaseModel):
    user_id: int
    mode: Literal["bot", "user"]
    difficulty: Optional[Literal["easy", "medium", "hard", "impossible"]] = None
    color: Optional[Literal["white", "black", "random"]] = "white"
    duration: Optional[Literal[1, 3, 5, 10]] = 5


class MoveForm(BaseModel):
    game_id: str
    move: str


class LoadGameForm(BaseModel):
    game_id: str


class CheckUserForm(BaseModel):
    user_id: int
