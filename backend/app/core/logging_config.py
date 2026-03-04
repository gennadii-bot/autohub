"""Production logging configuration with structured JSON output."""

import json
import logging
import sys

from app.core.config import settings


class JsonFormatter(logging.Formatter):
    """Structured JSON formatter for production logs."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: dict = {
            "timestamp": self.formatTime(record, self.datefmt or "%Y-%m-%d %H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "lineno": record.lineno,
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj, ensure_ascii=False)


def setup_logging() -> None:
    """Configure application logging. JSON format in production, human-readable in dev."""
    level = logging.DEBUG if settings.debug else logging.INFO
    use_json = not settings.debug or settings.environment == "production"

    # Root logger
    root = logging.getLogger()
    root.setLevel(level)

    # Console handler
    if not root.handlers:
        console = logging.StreamHandler(sys.stdout)
        console.setLevel(level)
        if use_json:
            console.setFormatter(JsonFormatter())
        else:
            console.setFormatter(
                logging.Formatter(
                    "%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S",
                )
            )
        root.addHandler(console)

    # Reduce noise from third-party libs
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.DEBUG if settings.debug else logging.WARNING
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
