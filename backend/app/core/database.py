"""MongoDB async connection via Motor."""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db():
    global _client, _db
    try:
        _client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)
        await _client.admin.command("ping")
        _db = _client[settings.MONGODB_DB]
        print(f" MongoDB connected: {settings.MONGODB_URL}")
    except Exception as e:
        print(f"  MongoDB unavailable ({e}). Running with in-memory fallback.")
        _client = None
        _db = None


async def disconnect_db():
    global _client
    if _client:
        _client.close()


def get_db() -> AsyncIOMotorDatabase | None:
    return _db
