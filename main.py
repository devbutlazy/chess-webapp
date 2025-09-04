import asyncio

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from uvicorn.config import Config
from uvicorn.server import Server

from core.api.routers.misc import router as misc_router
from core.database import init_db

def init_fastapi_routers(app: FastAPI) -> None:
    """
    Include routers from the presentation layerCommandStart

    :param app: The FastAPI application.
    :return: None
    """
    app.include_router(misc_router)

# async def start_telegram_bot() -> None:
#     """
#     Start the Telegram bot.

#     :return: None
#     """
#     bot = Bot(
#         token=settings.BOT_TOKEN,
#         default=DefaultBotProperties(parse_mode=ParseMode.HTML),
#     )
#     dp = Dispatcher()

#     await dp.start_polling(bot)
    
async def main() -> None:
    app = FastAPI(docs_url=None, redoc_url=None)

    app.mount("/js", StaticFiles(directory="frontend/js"), name="js")
    app.mount("/css", StaticFiles(directory="frontend/css"), name="css")

    config = Config(app=app, host="0.0.0.0", port=8080, loop="asyncio")
    server = Server(config=config)

    init_fastapi_routers(app)
    await asyncio.gather(init_db(), server.serve()) # start_telegram_bot()

if __name__ == "__main__":
    asyncio.run(main())
