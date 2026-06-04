"""Tests for state management."""

from pathlib import Path

import pytest

from promptflow.errors import StateError
from promptflow.models import RunStatus
from promptflow.state import StateManager


class TestStateManager:
    def test_create_run(self, tmp_path: Path) -> None:
        sm = StateManager(tmp_path)
        state, run_dir = sm.create_run(
            sequence="full",
            target_repo=".",
            prompt_pack="./prompts",
            provider="manual",
            model=None,
        )
        assert state.run_id.startswith("20")
        assert state.sequence == "full"
        assert state.status == RunStatus.INITIALIZED.value
        assert (run_dir / "state.json").exists()
        assert (run_dir / "prompts").exists()
        assert (run_dir / "responses").exists()
        assert (run_dir / "reports").exists()

    def test_save_and_load(self, tmp_path: Path) -> None:
        sm = StateManager(tmp_path)
        state, run_dir = sm.create_run("audit-only", ".", "./prompts", "manual", None)
        state.status = RunStatus.COMPLETED.value
        state.completed_stages = ["01"]
        sm.save(state, run_dir)

        loaded = sm.load(run_dir)
        assert loaded.status == RunStatus.COMPLETED.value
        assert loaded.completed_stages == ["01"]

    def test_find_latest_run(self, tmp_path: Path) -> None:
        sm = StateManager(tmp_path)
        assert sm.find_latest_run() is None
        state1, dir1 = sm.create_run("full", ".", "./prompts", "manual", None)
        sm.save(state1, dir1)
        latest = sm.find_latest_run()
        assert latest is not None
        assert latest.name == dir1.name

    def test_load_missing_state(self, tmp_path: Path) -> None:
        sm = StateManager(tmp_path)
        with pytest.raises(StateError, match="not found"):
            sm.load(tmp_path / "fake")

    def test_list_runs(self, tmp_path: Path) -> None:
        sm = StateManager(tmp_path)
        state1, dir1 = sm.create_run("full", ".", "./prompts", "manual", None)
        sm.save(state1, dir1)
        runs = sm.list_runs()
        assert len(runs) == 1
