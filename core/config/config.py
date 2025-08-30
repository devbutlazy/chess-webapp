import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """

    BOT_TOKEN: str  # Telegram bot token
    BOT_ADMINS_ID: list[int]  # Telegram bot's admins IDs'
    DB_NAME: str  # Database name
    STOCKFISH_PATH: str  # Path to Stokfish binary

    @property
    def DB_URL(self) -> str:
        return f"sqlite+aiosqlite:///{self.DB_NAME}.db"

    @property
    def SYNC_DB_URL(self) -> str:
        return f"sqlite:///./{self.DB_NAME}.db"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
    )


settings = Settings()
