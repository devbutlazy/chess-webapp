import random

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import async_sessionmaker

from core.database import engine
from core.database.repositories.base import BaseRepository
from core.database.models.user import ChessGameORM, UserORM

from typing import Self, List


class ChessGameRepository(BaseRepository):
    DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR {} KQkq - 0 1"

    def __init__(self):
        self.session: async_sessionmaker

    async def __aenter__(self: Self) -> Self:
        self.session = async_sessionmaker(engine)
        return self

    async def __aexit__(self, exc_type, exc_value, exc_tb) -> None:  # noqa
        return await self.session().close()

    async def _generate_unique_game_id(self, session, user_id: int) -> str:
        existing_ids = set(
            (
                row[0]
                for row in (
                    await session.execute(
                        select(ChessGameORM.game_id).where(
                            ChessGameORM.user_id == user_id
                        )
                    )
                ).all()
            )
        )

        while True:
            candidate = f"{random.randint(0, 999999):06d}"
            if candidate not in existing_ids:
                return candidate

    async def create_game(
        self, user_id: int, fen: str, player_color: str, difficulty: str
    ) -> ChessGameORM:
        async with self.session() as session:
            game_id = await self._generate_unique_game_id(session, user_id)

            new_game = ChessGameORM(
                user_id=user_id,
                game_id=game_id,
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
            default_fen_white = self.DEFAULT_FEN.format("w")
            default_fen_black = self.DEFAULT_FEN.format("b")

            await session.execute(
                delete(ChessGameORM).where(
                    ChessGameORM.user_id == user_id,
                    ChessGameORM.is_active == True,
                    ChessGameORM.fen.in_([default_fen_white, default_fen_black]),
                )
            )
            await session.commit()

            result = await session.execute(
                select(ChessGameORM).where(
                    ChessGameORM.user_id == user_id, ChessGameORM.is_active == True
                )
            )

            return result.scalars().all()

    async def get_game(self, game_id: int) -> ChessGameORM | None:
        async with self.session() as session:
            result = await session.execute(
                select(ChessGameORM).where(ChessGameORM.game_id == game_id)
            )
            return result.scalar_one_or_none()

    async def update_fen(self, game_id: int, new_fen: str) -> None:
        async with self.session() as session:
            await session.execute(
                update(ChessGameORM)
                .where(ChessGameORM.game_id == game_id)
                .values(fen=new_fen)
            )
            await session.commit()

    async def deactivate_game(self, game_id: int) -> None:
        async with self.session() as session:
            await session.execute(
                update(ChessGameORM)
                .where(ChessGameORM.game_id == game_id)
                .values(is_active=False)
            )
            await session.commit()
