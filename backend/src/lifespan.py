from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from src.core.config import ENV, PORT
from src.core.logging import logger
from src.db.session import engine

@asynccontextmanager
async def lifespan(app: FastAPI):

    app.state.db_engine = engine

    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connected successfully")

    except Exception:
        logger.exception("Database connection failed")
        raise

    if ENV == "dev":
        logger.info(f"Listening on http://localhost:{PORT}")
        logger.info(f"Docs available at http://localhost:{PORT}/docs")
    else:
        logger.info("Running in PRODUCTION mode")

    yield

    logger.info("Server shutting down")
