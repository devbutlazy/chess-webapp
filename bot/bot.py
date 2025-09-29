import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart
from aiogram.types import (
    Message,
    FSInputFile,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)

from backend.config.config import settings

dp = Dispatcher()


@dp.message(CommandStart())
async def command_start_handler(message: Message) -> None:
    photo = FSInputFile("bot/assets/ChessWebAppWelcome.png")

    caption = (
        "<b>Welcome to ChessWebApp</b> — the best Chess Bot in Telegram.\n\n"
        "♦️ You can improve your skills by playing with bot or enjoy a game versus your friend."
    )

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Open ChessWebApp",
                    web_app=WebAppInfo(url=settings.ENDPOINT_URL), 
                )
            ],
            [InlineKeyboardButton(text="Join Channel", url="https://t.me/dev_bin")],
        ]
    )

    await message.answer_photo(photo=photo, caption=caption, reply_markup=keyboard)


async def main() -> None:
    bot = Bot(
        token=settings.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    await dp.start_polling(bot)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    asyncio.run(main())
