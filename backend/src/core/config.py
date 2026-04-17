import os
from pathlib import Path

from dotenv import load_dotenv

# Resolve .env relative to this file regardless of working directory
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")


def get_env(key: str, default=None, required: bool = False):
    value = os.getenv(key, default)
    if required and value is None:
        raise ValueError(f"Missing required env variable: {key}")
    return value


PORT = int(get_env("PORT", 8000))
ENV = get_env("ENV", "dev")
ALLOWED_CORS_ORIGINS = get_env("ALLOWED_CORS_ORIGINS", "").split(",")
DB_URL = get_env("DB_URL", "")
DB_POOL_SIZE = int(get_env("DB_POOL_SIZE", 10))
DB_MAX_OVERFLOW = int(get_env("DB_MAX_OVERFLOW", 20))
DB_POOL_TIMEOUT = int(get_env("DB_POOL_TIMEOUT", 30))
