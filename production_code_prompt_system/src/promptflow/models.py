"""Core data models for PromptFlow."""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any


class RunStatus(enum.Enum):
    """Possible statuses for a workflow run."""

    INITIALIZED = "initialized"
    RUNNING = "running"
    BLOCKED = "blocked"
    FAILED = "failed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class WorkflowMode(enum.Enum):
    """Patch application modes."""

    REPORT_ONLY = "report-only"
    PATCH_REVIEW = "patch-review"
    APPLY_PATCH = "apply-patch"


@dataclass
class Prompt:
    """Represents a single prompt in the pack."""

    stage_id: str
    title: str
    file_path: Path
    order: int


@dataclass
class PromptRequest:
    """Payload sent to an AI provider."""

    stage_id: str
    stage_title: str
    sequence_name: str
    target_repo: str
    previous_stages: list[str]
    prompt_content: str
    repo_context: str
    previous_outputs: dict[str, str] = field(default_factory=dict)

    def to_markdown(self) -> str:
        """Render the request as a markdown document."""
        lines = [
            "# Workflow Stage",
            "",
            f"- Stage ID: {self.stage_id}",
            f"- Stage title: {self.stage_title}",
            f"- Sequence: {self.sequence_name}",
            f"- Target repository: {self.target_repo}",
            f"- Previous stages completed: {', '.join(self.previous_stages) or 'None'}",
            f"- Current task: Execute stage {self.stage_id}",
            "",
            "# Specialist Prompt",
            "",
            self.prompt_content,
            "",
            "# Repository Context",
            "",
            self.repo_context,
            "",
        ]
        if self.previous_outputs:
            lines.extend([
                "# Previous Stage Outputs",
                "",
            ])
            for sid, output in self.previous_outputs.items():
                lines.extend([f"## {sid}", "", output, ""])
        lines.extend([
            "# Execution Rules",
            "",
            "- Do not invent commands.",
            "- Do not invent files.",
            "- Do not modify files unless explicitly instructed.",
            "- Provide exact file paths.",
            "- Provide verification commands only if real.",
            "- Stop on blockers.",
            "- Provide rollback steps.",
            "",
        ])
        return "\n".join(lines)


@dataclass
class PromptResponse:
    """Response received from an AI provider."""

    stage_id: str
    content: str
    provider: str
    model: str | None = None
    finished_at: datetime | None = None


@dataclass
class RunState:
    """Persisted state for a single workflow run."""

    run_id: str
    sequence: str
    target_repo: str
    prompt_pack: str
    started_at: str
    updated_at: str
    current_stage: str = ""
    completed_stages: list[str] = field(default_factory=list)
    failed_stages: list[str] = field(default_factory=list)
    blockers: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    provider: str = "manual"
    model: str | None = None
    status: str = RunStatus.INITIALIZED.value

    def to_dict(self) -> dict[str, Any]:
        return {
            "run_id": self.run_id,
            "sequence": self.sequence,
            "target_repo": self.target_repo,
            "prompt_pack": self.prompt_pack,
            "started_at": self.started_at,
            "updated_at": self.updated_at,
            "current_stage": self.current_stage,
            "completed_stages": self.completed_stages,
            "failed_stages": self.failed_stages,
            "blockers": self.blockers,
            "warnings": self.warnings,
            "provider": self.provider,
            "model": self.model,
            "status": self.status,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RunState:
        return cls(
            run_id=data["run_id"],
            sequence=data["sequence"],
            target_repo=data["target_repo"],
            prompt_pack=data["prompt_pack"],
            started_at=data["started_at"],
            updated_at=data["updated_at"],
            current_stage=data.get("current_stage", ""),
            completed_stages=data.get("completed_stages", []),
            failed_stages=data.get("failed_stages", []),
            blockers=data.get("blockers", []),
            warnings=data.get("warnings", []),
            provider=data.get("provider", "manual"),
            model=data.get("model"),
            status=data.get("status", RunStatus.INITIALIZED.value),
        )
