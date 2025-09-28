from __future__ import annotations
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.models.base import Base

if TYPE_CHECKING:
    from backend.database.models.chess import ChessGameORM


class UserORM(Base):
    """
    User ORM class for managing each user in database
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, unique=True)
    registration_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship
    games: Mapped[list["ChessGameORM"]] = relationship(
        "ChessGameORM",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    repr_cols_num: int = 4
