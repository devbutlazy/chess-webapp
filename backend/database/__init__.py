from sqlalchemy.ext.asyncio import create_async_engine

from backend.config.config import settings
from backend.database.models.base import Base

engine = create_async_engine(
    settings.DB_URL,
)


async def init_db() -> None:
    """
    Initialize database via Base-model metadata
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_table_by_name(table_name: str) -> None:
    """
    Drop a specific table by its name.

    :param table_name: Name of the table to drop.
    :return: None
    """
    async with engine.begin() as conn:
        table = Base.metadata.tables.get(table_name)

        if table is not None:
            await conn.run_sync(table.drop)
            print("Dropped table '%s'." % table_name)
        else:
            print(f"Table '{table_name}' does not exist.")
