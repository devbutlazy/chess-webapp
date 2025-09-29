from pydantic import BaseModel

from typing import Optional


class MoveRequest(BaseModel):
    game_id: str
    move: str


class MoveResponse(BaseModel):
    success: bool

    fen: str
    bot_move: Optional[str]
    game_over: bool

    result: Optional[str] = None
    reason: Optional[str] = None


class LoadGameRequest(BaseModel):
    game_id: str


class LoadGameResponse(BaseModel):
    success: bool
    game_id: str

    fen: str
    player_color: str
    difficulty: str


class ActiveGameResponse(BaseModel):
    game_id: str
    fen: str

    player_color: str
    difficulty: str
    last_played: str
