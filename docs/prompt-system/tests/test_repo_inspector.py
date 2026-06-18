"""Tests for repository inspection."""

from pathlib import Path

import pytest

from promptflow.errors import RepoInspectionError
from promptflow.repo_inspector import inspect_repo


class TestRepoInspector:
    def test_inspect_empty_repo(self, tmp_path: Path) -> None:
        result = inspect_repo(tmp_path)
        assert result["repo_path"] == str(tmp_path.resolve())
        assert result["total_files_scanned"] == 0
        assert result["detected_stacks"] == []

    def test_detects_node_stack(self, tmp_path: Path) -> None:
        (tmp_path / "package.json").write_text('{"name": "test"}')
        result = inspect_repo(tmp_path)
        assert "Node.js" in result["detected_stacks"]

    def test_respects_gitignore(self, tmp_path: Path) -> None:
        (tmp_path / ".gitignore").write_text("ignored.txt\n")
        (tmp_path / "kept.txt").write_text("keep me")
        (tmp_path / "ignored.txt").write_text("ignore me")
        result = inspect_repo(tmp_path, respect_gitignore=True)
        paths = result["file_tree"]
        assert "kept.txt" in paths
        assert "ignored.txt" not in paths

    def test_excludes_binary(self, tmp_path: Path) -> None:
        (tmp_path / "image.png").write_bytes(b"\x89PNG\r\n\x1a\n\x00\x00\x00\r")
        (tmp_path / "text.txt").write_text("hello world")
        result = inspect_repo(tmp_path)
        paths = result["file_tree"]
        assert "text.txt" in paths
        assert "image.png" not in paths

    def test_high_risk_detection(self, tmp_path: Path) -> None:
        (tmp_path / ".env").write_text("SECRET=value")
        result = inspect_repo(tmp_path)
        assert ".env" in result["high_risk_files"]

    def test_max_files_limit(self, tmp_path: Path) -> None:
        for i in range(100):
            (tmp_path / f"file{i}.txt").write_text("x")
        result = inspect_repo(tmp_path, max_files=10)
        assert len(result["source_summaries"]) <= 10

    def test_nonexistent_repo(self) -> None:
        with pytest.raises(RepoInspectionError, match="does not exist"):
            inspect_repo("/nonexistent/path/12345")

    def test_extra_excludes(self, tmp_path: Path) -> None:
        (tmp_path / "skip_me.log").write_text("log")
        (tmp_path / "keep_me.txt").write_text("text")
        result = inspect_repo(tmp_path, extra_excludes=["*.log"])
        assert "skip_me.log" not in result["file_tree"]
        assert "keep_me.txt" in result["file_tree"]
