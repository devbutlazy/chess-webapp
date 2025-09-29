from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter(tags=["pages"])


@router.get("/", response_class=FileResponse)
async def index():
    return FileResponse("frontend/html/index.html")


@router.get("/chess", response_class=FileResponse)
async def chess_page():
    return FileResponse("frontend/html/chess.html")
