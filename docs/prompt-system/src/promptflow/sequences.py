"""Sequence definitions and resolution."""

from __future__ import annotations

from promptflow.errors import ConfigError
from promptflow.models import Prompt

SEQUENCES: dict[str, list[str]] = {
    "full": [
        "14",
        "01",
        "08",
        "02",
        "03",
        "13",
        "04",
        "06",
        "07",
        "05",
        "12",
        "11",
        "09",
        "10",
        "15",
    ],
    "audit-only": ["14", "01"],
    "security": ["14", "03", "13", "12", "04"],
    "build-repair": ["14", "08", "09", "10"],
    "refactor": ["14", "01", "04", "06", "07", "15"],
    "frontend": ["14", "11", "05", "04", "10"],
    "release-certification": ["14", "15"],
    "docs": ["14", "10"],
}


def resolve_sequence(
    name: str,
    prompts: list[Prompt],
    custom_sequences: dict[str, list[str]] | None = None,
    include_orchestration: bool = True,
    from_stage: str | None = None,
    to_stage: str | None = None,
    only_stage: str | None = None,
) -> list[Prompt]:
    """Resolve a named or custom sequence into an ordered list of Prompts."""
    available = {p.stage_id: p for p in prompts}

    if only_stage is not None:
        if only_stage not in available:
            raise ConfigError(f"Stage '{only_stage}' not found in prompt pack.")
        return [available[only_stage]]

    combined = dict(SEQUENCES)
    if custom_sequences:
        combined.update(custom_sequences)

    if name not in combined:
        raise ConfigError(
            f"Unknown sequence '{name}'. Available: {', '.join(sorted(combined.keys()))}"
        )

    stage_ids = list(combined[name])

    if not include_orchestration and "14" in stage_ids:
        stage_ids.remove("14")

    if from_stage is not None:
        if from_stage not in stage_ids:
            raise ConfigError(f"Stage '{from_stage}' is not in sequence '{name}'.")
        idx = stage_ids.index(from_stage)
        stage_ids = stage_ids[idx:]

    if to_stage is not None:
        if to_stage not in stage_ids:
            raise ConfigError(f"Stage '{to_stage}' is not in sequence '{name}'.")
        idx = stage_ids.index(to_stage)
        stage_ids = stage_ids[: idx + 1]

    result: list[Prompt] = []
    for sid in stage_ids:
        if sid not in available:
            raise ConfigError(f"Stage '{sid}' is missing from the prompt pack.")
        result.append(available[sid])

    return result
