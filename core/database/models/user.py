from datetime import datetime

from sqlalchemy import Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database.models.base import Base


class UserORM(Base):
    """
    User children-ORM class for managing each user in database
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    registration_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # TODO: Additional information one-to-many with statistics, and other data

    repr_cols_num: int = 3
