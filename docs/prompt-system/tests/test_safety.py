"""Tests for safety systems."""

from pathlib import Path

from promptflow.safety import (
    backup_file,
    check_git_status,
    is_risky_command,
)


class TestSafety:
    def test_is_risky_command(self) -> None:
        assert is_risky_command("rm -rf /")
        assert is_risky_command("git reset --hard")
        assert not is_risky_command("pytest tests/")

    def test_check_git_status_non_git(self, tmp_path: Path) -> None:
        status = check_git_status(tmp_path)
        assert status["is_git"] is False

    def test_backup_file(self, tmp_path: Path) -> None:
        original = tmp_path / "test.txt"
        original.write_text("hello")
        backup = backup_file(original)
        assert backup.exists()
        assert backup.read_text() == "hello"
