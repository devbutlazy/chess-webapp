from fastapi import APIRouter
from fastapi.responses import HTMLResponse, JSONResponse

from backend.api.schemas.user import CheckUserForm
from backend.database.repositories.user import UserRepository

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
async def index() -> HTMLResponse:
    return HTMLResponse(open("frontend/html/index.html", encoding="utf-8").read())


@router.get("/chess.html", response_class=HTMLResponse)
async def chess_page() -> HTMLResponse:
    return HTMLResponse(open("frontend/html/chess.html", encoding="utf-8").read())


@router.post("/check_user/")
async def check_user(form: CheckUserForm) -> JSONResponse:
    async with UserRepository() as repository:
        user = await repository.get_one(user_id=form.user_id)

        if not user:
            user = await repository.add_one(form.user_id)
            message = f"User {form.user_id} registered successfully"
        else:
            message = f"User {form.user_id} already registered"

        return JSONResponse(
            {
                "allowed": True,
                "message": message,
                "user_id": user.user_id,
                "registration_date": user.registration_date.isoformat(),
            }
        )
