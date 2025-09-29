import os
import asyncio

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from uvicorn.config import Config
from uvicorn.server import Server

from backend.database import init_db
from backend.api.routers.user import router as user_router
from backend.api.routers.pages import router as pages_router
from backend.api.routers.chess.bot import router as bot_chess_router


def init_fastapi_routers(app: FastAPI) -> None:
    """
    Include routers from the presentation layerCommandStart

    :param app: The FastAPI application.
    :return: None
    """
    app.include_router(user_router)
    app.include_router(pages_router)
    app.include_router(bot_chess_router)


async def main() -> None:
    app = FastAPI(docs_url=None, redoc_url=None)

    app.mount("/js", StaticFiles(directory="frontend/js"), name="js")
    app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
    app.mount("/assets", StaticFiles(directory="frontend/assets"), name="assets")

    config = Config(
        app=app,
        host="0.0.0.0",
        port=int(os.environ.get("APP_PORT", 8080)),
        loop="asyncio",
    )
    server = Server(config=config)

    init_fastapi_routers(app)
    await asyncio.gather(init_db(), server.serve())


if __name__ == "__main__":
    asyncio.run(main())
