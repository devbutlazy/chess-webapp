from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from core.database import engine
from core.database.repositories.base import BaseRepository
from core.database.models.user import UserORM

from typing import Self, Type


class UserRepository(BaseRepository):
    def __init__(self):
        self.session: async_sessionmaker

    async def __aenter__(self: Self) -> Self:
        self.session = async_sessionmaker(engine)
        return self

    async def __aexit__(self, exc_type, exc_value, exc_tb) -> None:  # noqa
        return await self.session().close()

    async def get_one(self, **kwargs) -> Type[UserORM] | None:
        """
        Get user-entry by it's id, if it exists
        :param kwargs: id
        :return: UserORM
        """
        user_id = kwargs.get("user_id")
        if not user_id:
            raise ValueError("User ID not specified")

        async with self.session() as session:
            result = await session.execute(
                select(UserORM).where(UserORM.user_id == user_id)
            )
            return result.scalar_one_or_none()

    async def add_one(self, user_id: int) -> UserORM:
        """
        Add a new user with given user_id and current timestamp as registration_date.
        :param user_id: Telegram user ID
        :return: created UserORM instance
        """

        async with self.session() as session:
            new_user = UserORM(
                user_id=user_id, registration_date=datetime.now(timezone.utc)
            )
            session.add(new_user)

            await session.commit()
            await session.refresh(new_user)

            return new_user

    async def remove_one(self, **kwargs) -> ValueError | str:
        """
        Remove user by user_id and reindex remaining users
        :param kwargs: user_id
        :return: ValueError or str
        """
        user_id = kwargs.get("user_id")
        if not user_id:
            raise ValueError("User ID not specified")

        async with self.session() as session:
            if not (
                user := await session.execute(
                    select(UserORM).where(UserORM.user_id == user_id)
                )
            ):
                return f"No user with user_id {user_id} found"

            user_instance = user.scalars().first()
            if not user_instance:
                return f"No user with user_id {user_id} found"

            await session.delete(user_instance)
            await session.flush()

            result = await session.execute(select(UserORM).order_by(UserORM.id))
            users = result.scalars().all()

            for index, u in enumerate(users):
                u.id = index + 1

            await session.commit()
            return f"User with user_id {user_id} removed"
