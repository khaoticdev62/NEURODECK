"""Tests for sequence resolution."""

from pathlib import Path

import pytest

from promptflow.config import ConfigError
from promptflow.models import Prompt
from promptflow.sequences import resolve_sequence


def _make_prompts(ids: list[str]) -> list[Prompt]:
    return [
        Prompt(stage_id=sid, title=f"Prompt {sid}", file_path=Path(f"{sid}.md"), order=int(sid))
        for sid in ids
    ]


class TestSequences:
    def test_full_sequence(self) -> None:
        prompts = _make_prompts([str(i).zfill(2) for i in range(1, 16)])
        result = resolve_sequence("full", prompts)
        ids = [p.stage_id for p in result]
        assert ids[0] == "14"
        assert ids[-1] == "15"
        assert "01" in ids

    def test_audit_only_sequence(self) -> None:
        prompts = _make_prompts(["01", "14"])
        result = resolve_sequence("audit-only", prompts)
        assert [p.stage_id for p in result] == ["14", "01"]

    def test_unknown_sequence(self) -> None:
        prompts = _make_prompts(["01"])
        with pytest.raises(ConfigError, match="Unknown sequence"):
            resolve_sequence("nonexistent", prompts)

    def test_only_stage(self) -> None:
        prompts = _make_prompts(["01", "02", "03"])
        result = resolve_sequence("full", prompts, only_stage="02")
        assert [p.stage_id for p in result] == ["02"]

    def test_from_to_range(self) -> None:
        prompts = _make_prompts([str(i).zfill(2) for i in range(1, 16)])
        result = resolve_sequence("full", prompts, from_stage="03", to_stage="07")
        ids = [p.stage_id for p in result]
        assert ids[0] == "03"
        assert ids[-1] == "07"
        assert "02" not in ids
        assert "08" not in ids

    def test_custom_sequence(self) -> None:
        prompts = _make_prompts(["01", "02", "03"])
        custom = {"my-seq": ["03", "01"]}
        result = resolve_sequence("my-seq", prompts, custom_sequences=custom)
        assert [p.stage_id for p in result] == ["03", "01"]

    def test_exclude_orchestration(self) -> None:
        prompts = _make_prompts(["01", "14"])
        result = resolve_sequence("audit-only", prompts, include_orchestration=False)
        assert [p.stage_id for p in result] == ["01"]
