from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from src.core.logging import logger
from src.core.config import ALLOWED_CORS_ORIGINS
from src.lifespan import lifespan
from src.api import routes


app = FastAPI(
    title="Connectivity AI chatbot Admin Dashboard",
    version="1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.get("/")
def home():
    logger.info("App is running")
    return "App is running"

app.include_router(routes.router, prefix="/api")
