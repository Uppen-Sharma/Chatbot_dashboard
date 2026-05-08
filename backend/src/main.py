import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

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


# ---------------------------------------------------------------------------
# Request Logging Middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Logs every HTTP request with method, path, status code, and duration.

    Output format:
        GET  /api/users          → 200 OK   (12ms)
        POST /api/upload-file    → 415 ERR  (3ms)

    Skips logging for the health-check root endpoint to avoid noise.
    """
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000)

    path = request.url.path

    # Skip the root health-check to keep logs clean
    if path != "/":
        status = response.status_code
        ok_flag = "OK " if status < 400 else "ERR"
        logger.info(
            f"{request.method:<6} {path:<40} → {status} {ok_flag}  ({duration_ms}ms)"
        )

    return response


# ---------------------------------------------------------------------------
# Global Exception Handlers
# ---------------------------------------------------------------------------

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    Catches any unhandled SQLAlchemy database errors (connection drops,
    query failures, integrity violations, etc.).
    Logs the full traceback server-side and returns a safe 503 to the client.
    """
    logger.error(
        f"Database error on {request.method} {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=503,
        content={
            "error": "database_error",
            "message": "A database error occurred. Please try again later.",
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Catches Pydantic / FastAPI request-body and query-param validation failures.
    Returns a 422 with structured field-level error details so the frontend
    can surface exactly which parameter was invalid.
    """
    errors = [
        {
            "field": " -> ".join(str(loc) for loc in err["loc"]),
            "message": err["msg"],
            "type": err["type"],
        }
        for err in exc.errors()
    ]
    logger.warning(
        f"Validation error on {request.method} {request.url.path}: {errors}"
    )
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "message": "One or more request parameters are invalid.",
            "details": errors,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Catch-all for any unhandled Python exception that reaches the top level.
    Prevents raw 500 stack traces from leaking to the client.
    """
    logger.critical(
        f"Unhandled exception on {request.method} {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred. Our team has been notified.",
        },
    )


@app.get("/")
def home():
    logger.info("App is running")
    return "App is running"

app.include_router(routes.router, prefix="/api")
