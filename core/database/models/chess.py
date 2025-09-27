from __future__ import annotations
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database.models.base import Base


if TYPE_CHECKING:
    from core.database.models.user import UserORM


class ChessGameORM(Base):
    """
    ORM for storing chess game state per user.
    """

    __tablename__ = "chess_games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    game_id: Mapped[str] = mapped_column(String(6), nullable=False)

    fen: Mapped[str] = mapped_column(String, nullable=False)
    player_color: Mapped[str] = mapped_column(String, nullable=False)
    difficulty: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["UserORM"] = relationship("UserORM", back_populates="games")

    __table_args__ = (UniqueConstraint("user_id", "game_id", name="uq_user_gameid"),)
    repr_cols_num: int = 10
