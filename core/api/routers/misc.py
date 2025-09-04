from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, HTMLResponse

from core.database.repositories.user import UserRepository

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
async def index() -> HTMLResponse:
    with open("frontend/html/base.html", "r", encoding="utf-8") as file:
        return HTMLResponse(file.read())


@router.post("/check_user/")
async def check_user(request: Request) -> JSONResponse:
    data = await request.json()
    user_id = data.get("user_id")

    if not user_id:
        return JSONResponse({"allowed": False, "message": "User ID not provided"})

    async with UserRepository() as repo:
        user = await repo.get_one(user_id=user_id)
        return JSONResponse({"allowed": bool(user)  })


@router.post("/register_user/")
async def register_user(request: Request) -> JSONResponse:
    data = await request.json()
    user_id = data.get("user_id")

    if not user_id:
        return JSONResponse({"success": False, "message": "User ID not provided"})

    async with UserRepository() as repository:
        existing_user = await repository.get_one(user_id=user_id)
        if existing_user:
            return JSONResponse({
                "success": True,
                "message": f"User {user_id} already registered"
            })

        new_user = await repository.add_one(user_id)
        return JSONResponse({
            "success": True,
            "message": f"User {user_id} registered successfully",
            "user_id": new_user.user_id,
            "registration_date": new_user.registration_date.isoformat()
        })
