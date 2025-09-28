from pydantic import BaseModel


class MoveForm(BaseModel):
    game_id: str
    move: str


class LoadGameForm(BaseModel):
    game_id: str
