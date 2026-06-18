"""Prompt pack discovery and validation."""

from __future__ import annotations

import re
from pathlib import Path

from promptflow.errors import PromptPackError
from promptflow.models import Prompt

PROMPT_FILENAME_RE = re.compile(r"^(\d+)_(.+)\.md$")
EXPECTED_PROMPTS = {
    "01": "codebase_audit_refinement",
    "02": "bugfix_implementation",
    "03": "security_hardening_owasp",
    "04": "testing_regression_coverage",
    "05": "performance_efficiency",
    "06": "deep_codebase_refactor",
    "07": "architecture_recovery_modularization",
    "08": "dependency_hygiene_build_system",
    "09": "cicd_release_engineering",
    "10": "documentation_developer_handoff",
    "11": "ux_ui_accessibility",
    "12": "observability_runtime_reliability",
    "13": "data_layer_api_contracts",
    "14": "ai_agent_orchestration",
    "15": "final_release_certification",
}


def discover_prompts(prompt_pack_dir: Path | str) -> list[Prompt]:
    """Discover and validate all prompt files in the given directory."""
    directory = Path(prompt_pack_dir)
    if not directory.exists():
        raise PromptPackError(f"Prompt pack directory does not exist: {directory}")
    if not directory.is_dir():
        raise PromptPackError(f"Prompt pack path is not a directory: {directory}")

    prompts: list[Prompt] = []
    found_ids: set[str] = set()

    for file_path in sorted(directory.iterdir()):
        if not file_path.is_file():
            continue
        match = PROMPT_FILENAME_RE.match(file_path.name)
        if not match:
            continue
        stage_id, slug = match.groups()
        if stage_id in found_ids:
            raise PromptPackError(f"Duplicate prompt stage ID {stage_id}: {file_path.name}")
        found_ids.add(stage_id)

        if file_path.stat().st_size == 0:
            raise PromptPackError(f"Prompt file is empty: {file_path.name}")

        title = _infer_title(slug)
        prompts.append(
            Prompt(
                stage_id=stage_id,
                title=title,
                file_path=file_path,
                order=int(stage_id),
            )
        )

    prompts.sort(key=lambda p: p.order)

    # Validate expected set
    missing = set(EXPECTED_PROMPTS.keys()) - found_ids
    if missing:
        missing_names = [f"{m}_{EXPECTED_PROMPTS[m]}.md" for m in sorted(missing)]
        raise PromptPackError(f"Missing required prompt files: {', '.join(missing_names)}")

    return prompts


def _infer_title(slug: str) -> str:
    """Convert a filename slug to a human-readable title."""
    words = slug.replace("_", " ").split()
    return " ".join(word.capitalize() for word in words)
