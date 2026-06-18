"""State persistence and management for workflow runs."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from promptflow.errors import StateError
from promptflow.models import RunState, RunStatus


class StateManager:
    """Manages run state files and directories."""

    def __init__(self, output_dir: Path | str) -> None:
        self.output_dir = Path(output_dir)

    def create_run(
        self, sequence: str, target_repo: str, prompt_pack: str, provider: str, model: str | None
    ) -> tuple[RunState, Path]:
        """Create a new run directory and state file."""
        now = datetime.now()
        run_id = now.strftime("%Y-%m-%d_%H%M%S") + f"_{sequence}"
        run_dir = self.output_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=True)

        # Create subdirectories
        (run_dir / "prompts").mkdir(exist_ok=True)
        (run_dir / "responses").mkdir(exist_ok=True)
        (run_dir / "reports").mkdir(exist_ok=True)
        (run_dir / "logs").mkdir(exist_ok=True)

        state = RunState(
            run_id=run_id,
            sequence=sequence,
            target_repo=target_repo,
            prompt_pack=prompt_pack,
            started_at=now.isoformat(),
            updated_at=now.isoformat(),
            provider=provider,
            model=model,
            status=RunStatus.INITIALIZED.value,
        )
        self._save(state, run_dir)
        return state, run_dir

    def save(self, state: RunState, run_dir: Path | str) -> None:
        """Save state to disk."""
        self._save(state, Path(run_dir))

    def _save(self, state: RunState, run_dir: Path) -> None:
        state.updated_at = datetime.now().isoformat()
        state_path = run_dir / "state.json"
        with state_path.open("w", encoding="utf-8") as f:
            json.dump(state.to_dict(), f, indent=2)

    def load(self, run_dir: Path | str) -> RunState:
        """Load state from a run directory."""
        run_dir = Path(run_dir)
        state_path = run_dir / "state.json"
        if not state_path.exists():
            raise StateError(f"State file not found: {state_path}")
        try:
            with state_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except json.JSONDecodeError as exc:
            raise StateError(f"Invalid state JSON: {exc}") from exc
        return RunState.from_dict(data)

    def find_latest_run(self) -> Path | None:
        """Find the most recent run directory."""
        if not self.output_dir.exists():
            return None
        runs = [d for d in self.output_dir.iterdir() if d.is_dir() and (d / "state.json").exists()]
        if not runs:
            return None
        # Sort by directory name (timestamp prefix ensures chronological order)
        runs.sort(key=lambda p: p.name, reverse=True)
        return runs[0]

    def list_runs(self) -> list[Path]:
        """List all run directories."""
        if not self.output_dir.exists():
            return []
        return sorted(
            [d for d in self.output_dir.iterdir() if d.is_dir() and (d / "state.json").exists()],
            key=lambda p: p.name,
            reverse=True,
        )

    def get_run_dir(self, run_id: str) -> Path:
        """Get the directory for a specific run ID."""
        return self.output_dir / run_id
