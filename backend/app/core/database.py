"""Database connection and session management"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


# Check if using SQLite
is_sqlite = "sqlite" in settings.DATABASE_URL.lower()

# Async engine for FastAPI
engine_kwargs = {
    "echo": settings.DEBUG,
}

# SQLite doesn't support pool_size
if not is_sqlite:
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20
    })

async_engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

# Sync engine for migrations and GIS operations
sync_engine = create_engine(
    settings.DATABASE_SYNC_URL,
    echo=settings.DEBUG
)

# Session factories
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

SyncSessionLocal = sessionmaker(
    sync_engine,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    """Base class for all models"""
    pass


async def get_db() -> AsyncSession:
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    async with async_engine.begin() as conn:
        # Only create PostGIS extension for PostgreSQL
        if not is_sqlite:
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            except Exception as e:
                print(f"Note: PostGIS extension not created: {e}")
        
        # Create tables
        await conn.run_sync(Base.metadata.create_all)
