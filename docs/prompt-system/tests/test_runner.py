"""Tests for workflow runner."""

from pathlib import Path

from promptflow.config import Config
from promptflow.models import Prompt, RunState, RunStatus
from promptflow.runner import WorkflowRunner
from promptflow.state import StateManager


class TestWorkflowRunner:
    def _setup(self, tmp_path: Path) -> tuple[Config, list[Prompt], StateManager, Path, RunState]:
        cfg = Config.default()
        cfg._data["target_repo"] = str(tmp_path / "repo")
        cfg._data["output_dir"] = str(tmp_path / "runs")
        cfg._data["provider"] = {
            "name": "manual",
            "model": None,
            "timeout_seconds": 120,
            "max_retries": 2,
        }
        cfg._data["workflow"] = {
            "sequence": "full",
            "stop_on_blocker": True,
            "mode": "report-only",
            "include_orchestration": True,
            "require_approval_for_patches": True,
        }
        cfg._data["context"] = {
            "max_context_files": 80,
            "max_file_bytes": 200_000,
            "include_git_status": False,
            "respect_gitignore": False,
            "redact_secrets": False,
            "exclude": [],
        }

        repo = tmp_path / "repo"
        repo.mkdir()
        (repo / "main.py").write_text("print('hello')\n")

        prompt_file = tmp_path / "01.md"
        prompt_file.write_text("# Audit prompt")
        prompts = [
            Prompt(stage_id="01", title="Audit", file_path=prompt_file, order=1),
        ]

        sm = StateManager(tmp_path / "runs")
        state, run_dir = sm.create_run("full", str(repo), "./prompts", "manual", None)
        return cfg, prompts, sm, run_dir, state

    def test_run_sequence_completes(self, tmp_path: Path) -> None:
        cfg, prompts, sm, run_dir, state = self._setup(tmp_path)
        runner = WorkflowRunner(cfg, prompts, sm, run_dir, state)
        result = runner.run_sequence(prompts, dry_run=True)
        assert result.status == RunStatus.COMPLETED.value
        assert "01" in result.completed_stages

    def test_detect_blockers(self, tmp_path: Path) -> None:
        cfg, prompts, sm, run_dir, state = self._setup(tmp_path)
        runner = WorkflowRunner(cfg, prompts, sm, run_dir, state)
        blockers = runner._detect_blockers("This is CRITICAL and tests fail.")
        assert "critical" in blockers
        assert "tests fail" in blockers

    def test_resume_skips_completed(self, tmp_path: Path) -> None:
        cfg, prompts, sm, run_dir, state = self._setup(tmp_path)
        state.completed_stages = ["01"]
        runner = WorkflowRunner(cfg, prompts, sm, run_dir, state)
        runner.dry_run = True
        result = runner.run_sequence(prompts, resume=True)
        assert result.status == RunStatus.COMPLETED.value
        # Should not add duplicate
        assert result.completed_stages == ["01"]
