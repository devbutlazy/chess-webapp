from abc import ABC, abstractmethod


class BaseRepository(ABC):
    @abstractmethod
    async def get_one(self, **kwargs):
        pass

    @abstractmethod
    async def add_one(self, **kwargs):
        pass

    @abstractmethod
    async def remove_one(self, **kwargs):
        pass
