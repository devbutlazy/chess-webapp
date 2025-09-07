from pydantic import BaseModel

from typing import Optional, Literal


class ChessGameForm(BaseModel):
    user_id: int
    mode: Literal["bot", "user"]
    difficulty: Optional[Literal["easy", "medium", "hard", "impossible"]] = None


class MoveForm(BaseModel):
    user_id: int
    move: str
