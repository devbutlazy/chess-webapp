from backend.database.repositories.user import UserRepository


async def get_user_repository():
    async with UserRepository() as repo:
        yield repo
