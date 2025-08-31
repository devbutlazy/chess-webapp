from typing import Tuple, List
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Base class for all models
    """

    repr_cols_num: int = 2
    repr_cols: Tuple[str, ...] = tuple()

    def __repr__(self) -> str:
        columns_to_display: List[str] = []
        columns = list(self.__table__.columns.keys())

        for idx, col in enumerate(columns):
            if col in self.repr_cols or idx < self.repr_cols_num:
                value = getattr(self, col)
                columns_to_display.append(f"{col}={value!r}")

        return f"<{self.__class__.__name__} {', '.join(columns_to_display)}>"
