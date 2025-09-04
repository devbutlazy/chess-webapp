from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, HTMLResponse

router = APIRouter()

allowed_users = [64560545421]

@router.get("/", response_class=HTMLResponse)
async def index() -> HTMLResponse:
    with open("frontend/html/base.html", "r", encoding="utf-8") as file:
        return HTMLResponse(file.read())

@router.post("/check_user/")
async def check_user(request: Request) -> JSONResponse:
    data = await request.json()
    user_id = data.get("user_id")
    return JSONResponse({"allowed": user_id in allowed_users})

@router.post("/register_user/")
async def register_user(request: Request) -> JSONResponse:
    data = await request.json()
    user_id = data.get("user_id")

    print(f"[REGISTER] Got request to register user {user_id}")
    return JSONResponse({"success": True, "message": "User registered (placeholder)"})
