"""Tests for safe command runner."""

from pathlib import Path

import pytest

from promptflow.commands import run_command
from promptflow.errors import SafetyError


class TestCommands:
    def test_run_safe_command(self, tmp_path: Path) -> None:
        # python --version is safe and in allowlist
        result = run_command(
            ["python", "--version"],
            require_confirmation=False,
        )
        assert result["executed"] is True
        assert result["returncode"] == 0

    def test_disallow_shell(self) -> None:
        with pytest.raises(SafetyError, match="shell=True"):
            run_command(["echo", "hello"], shell=True, require_confirmation=False)

    def test_disallow_risky(self) -> None:
        with pytest.raises(SafetyError, match="risky"):
            run_command(
                ["git", "reset", "--hard"],
                require_confirmation=False,
            )

    def test_disallow_not_in_allowlist(self) -> None:
        with pytest.raises(SafetyError, match="allowlist"):
            run_command(
                ["unknown_binary", "--flag"],
                require_confirmation=False,
            )
