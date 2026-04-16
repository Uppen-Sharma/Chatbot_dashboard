from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.core.config import DB_MAX_OVERFLOW, DB_POOL_SIZE, DB_POOL_TIMEOUT, DB_URL

engine = create_async_engine(
    DB_URL,
    pool_size=DB_POOL_SIZE,
    max_overflow=DB_MAX_OVERFLOW,
    pool_timeout=DB_POOL_TIMEOUT,
    pool_pre_ping=True,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
