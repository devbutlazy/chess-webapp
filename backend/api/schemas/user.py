from datetime import datetime

from pydantic import BaseModel


class CheckUserRequest(BaseModel):
    user_id: int


class UserResponse(BaseModel):
    allowed: bool
    message: str
    user_id: int
    registration_date: datetime
