import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """

    BOT_TOKEN: str  # Telegram bot token
    BOT_ADMINS_ID: list[int]  # Telegram bot's admins IDs'

    DB_HOST: str  # PostgreSQL host
    DB_PORT: int  # PostgreSQL port
    DB_NAME: str  # Database name
    DB_USER: str  # Database user
    DB_PASS: str  # Database password

    STOCKFISH_PATH: str  # Path to Stokfish binary
    ENDPOINT_URL: str # API endpoint URL

    @property
    def DB_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def SYNC_DB_URL(self) -> str:
        return (
            f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
    )


settings = Settings()
