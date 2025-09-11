from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from core.database import engine
from core.database.repositories.base import BaseRepository
from core.database.models.user import ChessGameORM

from typing import Self, List


class ChessGameRepository(BaseRepository):
    def __init__(self):
        self.session: async_sessionmaker

    async def __aenter__(self: Self) -> Self:
        self.session = async_sessionmaker(engine)
        return self

    async def __aexit__(self, exc_type, exc_value, exc_tb) -> None:  # noqa
        return await self.session().close()

    async def create_game(
        self, user_id: int, fen: str, player_color: str, difficulty: str
    ) -> ChessGameORM:
        async with self.session() as session:
            new_game = ChessGameORM(
                user_id=user_id,
                fen=fen,
                player_color=player_color,
                difficulty=difficulty,
                is_active=True,
            )

            session.add(new_game)
            await session.commit()
            await session.refresh(new_game)
            return new_game

    async def get_active_games(self, user_id: int) -> List[ChessGameORM]:
        async with self.session() as session:
            result = await session.execute(
                select(ChessGameORM).where(
                    ChessGameORM.user_id == user_id, ChessGameORM.is_active == True
                )
            )

            return result.scalars().all()

    async def get_game(self, game_id: int) -> ChessGameORM | None:
        async with self.session() as session:
            result = await session.execute(
                select(ChessGameORM).where(ChessGameORM.id == game_id)
            )
            return result.scalar_one_or_none()

    async def update_fen(self, game_id: int, new_fen: str) -> None:
        async with self.session() as session:
            await session.execute(
                update(ChessGameORM)
                .where(ChessGameORM.id == game_id)
                .values(fen=new_fen)
            )
            await session.commit()

    async def deactivate_game(self, game_id: int) -> None:
        async with self.session() as session:
            await session.execute(
                update(ChessGameORM)
                .where(ChessGameORM.id == game_id)
                .values(is_active=False)
            )
            await session.commit()
