from pydantic import BaseModel

class CheckUserForm(BaseModel):
    user_id: int
