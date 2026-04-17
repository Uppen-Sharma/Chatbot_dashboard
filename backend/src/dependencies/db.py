"""
Database Dependency
===================
Provides the FastAPI injectable `get_db` dependency used in route handlers.

Import from here rather than reaching into db/session.py directly,
so the rest of the codebase has a single, stable import path for
database session injection.

Usage:
    from src.dependencies.db import get_db

    @router.get("/example")
    async def example(db: AsyncSession = Depends(get_db)):
        ...
"""

from src.db.session import get_db  # noqa: F401 — re-exported intentionally

__all__ = ["get_db"]
