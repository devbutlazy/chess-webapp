from fastapi import APIRouter, Depends

from backend.api.schemas.user import CheckUserRequest
from backend.api.schemas.user import UserResponse
from backend.database.repositories.user import UserRepository
from backend.database.repositories import get_user_repository

router = APIRouter(prefix="/user", tags=["user"])


@router.post("/check", response_model=UserResponse)
async def check_user(
    form: CheckUserRequest,
    repository: UserRepository = Depends(get_user_repository),
):
    user = await repository.get_one(user_id=form.user_id)

    if not user:
        user = await repository.add_one(form.user_id)
        message = f"User {form.user_id} registered successfully"
    else:
        message = f"User {form.user_id} already registered"

    return UserResponse(
        allowed=True,
        message=message,
        user_id=user.user_id,
        registration_date=user.registration_date,
    )
