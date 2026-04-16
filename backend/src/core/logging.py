import logging
COLORS = {
    "DEBUG": "\033[36m",
    "INFO": "\033[32m",
    "WARNING": "\033[33m",
    "ERROR": "\033[31m",
    "CRITICAL": "\033[1;31m",
    "RESET": "\033[0m",
    "GREY": "\033[90m",
    "BLUE": "\033[34m",
}


class ColorFormatter(logging.Formatter):
    FORMAT = "{color}{levelname:<8}{reset} | {grey}{asctime}{reset} | {message}"

    def format(self, record):
        color = COLORS.get(record.levelname, COLORS["RESET"])
        formatter = logging.Formatter(
            self.FORMAT.format(
                grey=COLORS["GREY"],
                asctime="%(asctime)s",
                reset=COLORS["RESET"],
                color=color,
                levelname="%(levelname)s",
                blue=COLORS["BLUE"],
                name="%(name)s",
                message="%(message)s",
            ),
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        return formatter.format(record)

def setup_logger():

    logger = logging.getLogger("connectivity-ai-chatbot-api")

    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(ColorFormatter())
    logger.addHandler(console_handler)

    for name in ("uvicorn", "uvicorn.access", "uvicorn.error", "uvicorn.lifespan"):
        logging.getLogger(name).disabled = True

    return logger

logger = setup_logger()