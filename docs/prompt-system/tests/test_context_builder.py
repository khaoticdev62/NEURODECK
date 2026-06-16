"""Tests for context builder."""

from pathlib import Path
from unittest.mock import MagicMock

from promptflow.context_builder import build_context


class TestContextBuilder:
    def test_build_context_basic(self, tmp_path: Path) -> None:
        (tmp_path / "README.md").write_text("# Hello")
        (tmp_path / "main.py").write_text("print('hello')\n")

        config = MagicMock()
        config.context_respect_gitignore = False
        config.context_exclude = []
        config.context_max_context_files = 80
        config.context_max_file_bytes = 200_000
        config.context_redact_secrets = False

        ctx = build_context(tmp_path, config)
        assert "Repository Context" in ctx
        assert "main.py" in ctx
        assert "README.md" in ctx

    def test_build_context_with_redaction(self, tmp_path: Path) -> None:
        (tmp_path / ".env").write_text("API_KEY=secret123\n")
        (tmp_path / "config.py").write_text('API_KEY = "secret123"\n')

        config = MagicMock()
        config.context_respect_gitignore = False
        config.context_exclude = []
        config.context_max_context_files = 80
        config.context_max_file_bytes = 200_000
        config.context_redact_secrets = True

        ctx = build_context(tmp_path, config)
        assert "secret123" not in ctx
        assert "[REDACTED" in ctx
