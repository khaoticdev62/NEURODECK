"""Logging configuration for PromptFlow."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from rich.console import Console
from rich.logging import RichHandler

CONSOLE = Console(stderr=True)


class RedactionFilter(logging.Filter):
    """Prevent accidental secret leakage in logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        # Never log at DEBUG if the message looks like it contains a secret
        msg = record.getMessage()
        lowered = msg.lower()
        suspicious = (
            "api_key" in lowered
            or "apikey" in lowered
            or "password" in lowered
            or "secret" in lowered
            or "token" in lowered
            or "authorization" in lowered
        )
        return not (suspicious and record.levelno <= logging.DEBUG)


def setup_logging(
    *,
    level: int = logging.INFO,
    log_file: Path | None = None,
    verbose: bool = False,
) -> logging.Logger:
    """Configure logging with rich console output and optional file handler."""
    if verbose:
        level = logging.DEBUG

    logger = logging.getLogger("promptflow")
    logger.setLevel(level)
    logger.handlers = []
    logger.addFilter(RedactionFilter())

    # Rich console handler
    console_handler = RichHandler(
        console=CONSOLE,
        show_time=True,
        show_path=verbose,
        rich_tracebacks=True,
    )
    console_handler.setLevel(level)
    fmt = "%(message)s"
    if verbose:
        fmt = "[%(name)s] %(message)s"
    console_handler.setFormatter(logging.Formatter(fmt))
    logger.addHandler(console_handler)

    # Optional file handler
    if log_file is not None:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(
            logging.Formatter(
                "%(asctime)s [%(levelname)s] %(name)s - %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )
        logger.addHandler(file_handler)

    # Prevent propagation to root logger to avoid duplicate output
    logger.propagate = False
    return logger


def log_stage_transition(
    logger: logging.Logger,
    stage_id: str,
    status: str,
    title: str = "",
    **extra: Any,
) -> None:
    """Log a structured stage transition."""
    parts = [f"stage={stage_id}", f"status={status}"]
    if title:
        parts.append(f'title="{title}"')
    for key, value in extra.items():
        parts.append(f"{key}={value}")
    logger.info(" ".join(parts))
