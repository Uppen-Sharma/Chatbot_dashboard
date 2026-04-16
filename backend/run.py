from src.core.config import PORT

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        port=PORT,
        reload=True,
        access_log=False,
        log_config=None,
    )
