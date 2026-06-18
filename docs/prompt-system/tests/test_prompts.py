"""Tests for prompt pack discovery."""

from pathlib import Path

import pytest

from promptflow.errors import PromptPackError
from promptflow.prompts import discover_prompts


class TestPromptDiscovery:
    def test_discover_prompts_success(self, tmp_path: Path) -> None:
        pack = tmp_path / "prompts"
        pack.mkdir()
        for i in range(1, 16):
            (pack / f"{i:02d}_test_prompt.md").write_text(f"Content {i}")
        prompts = discover_prompts(pack)
        assert len(prompts) == 15
        assert prompts[0].stage_id == "01"
        assert prompts[-1].stage_id == "15"

    def test_missing_directory(self, tmp_path: Path) -> None:
        with pytest.raises(PromptPackError, match="does not exist"):
            discover_prompts(tmp_path / "missing")

    def test_empty_file(self, tmp_path: Path) -> None:
        pack = tmp_path / "prompts"
        pack.mkdir()
        for i in range(1, 16):
            (pack / f"{i:02d}_test_prompt.md").write_text(f"Content {i}")
        (pack / "01_test_prompt.md").write_text("")
        with pytest.raises(PromptPackError, match="empty"):
            discover_prompts(pack)

    def test_missing_required_files(self, tmp_path: Path) -> None:
        pack = tmp_path / "prompts"
        pack.mkdir()
        for i in range(1, 10):
            (pack / f"{i:02d}_test_prompt.md").write_text(f"Content {i}")
        with pytest.raises(PromptPackError, match="Missing required prompt files"):
            discover_prompts(pack)

    def test_non_md_files_ignored(self, tmp_path: Path) -> None:
        pack = tmp_path / "prompts"
        pack.mkdir()
        for i in range(1, 16):
            (pack / f"{i:02d}_test_prompt.md").write_text(f"Content {i}")
        (pack / "README.txt").write_text("ignore me")
        (pack / "script.py").write_text("ignore me too")
        prompts = discover_prompts(pack)
        assert len(prompts) == 15
