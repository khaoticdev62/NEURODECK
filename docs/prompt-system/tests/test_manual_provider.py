"""Tests for manual provider."""

from pathlib import Path
from unittest.mock import patch

import pytest

from promptflow.errors import ProviderError
from promptflow.models import PromptRequest
from promptflow.providers.manual import ManualProvider


class TestManualProvider:
    def test_manual_provider_name(self) -> None:
        p = ManualProvider()
        assert p.name == "manual"

    def test_complete_with_text_input(self, tmp_path: Path) -> None:
        provider = ManualProvider(output_dir=tmp_path)
        request = PromptRequest(
            stage_id="01",
            stage_title="Test",
            sequence_name="test",
            target_repo=".",
            previous_stages=[],
            prompt_content="Do something",
            repo_context="Repo info",
        )

        with (
            patch(
                "builtins.input",
                side_effect=["Response line 1", "Response line 2", "", EOFError],
            ),
            patch("promptflow.providers.manual.console"),
        ):
            response = provider.complete(request)

        assert response.stage_id == "01"
        assert response.provider == "manual"
        assert "Response line 1" in response.content
        assert "Response line 2" in response.content
        assert (tmp_path / "prompts" / "01_payload.md").exists()

    def test_complete_with_file_input(self, tmp_path: Path) -> None:
        response_file = tmp_path / "response.md"
        response_file.write_text("Loaded from file")

        provider = ManualProvider(output_dir=tmp_path)
        request = PromptRequest(
            stage_id="01",
            stage_title="Test",
            sequence_name="test",
            target_repo=".",
            previous_stages=[],
            prompt_content="Do something",
            repo_context="Repo info",
        )

        with (
            patch("builtins.input", side_effect=[str(response_file)]),
            patch("promptflow.providers.manual.console"),
        ):
            response = provider.complete(request)

        assert response.content == "Loaded from file"

    def test_complete_empty_response_raises(self, tmp_path: Path) -> None:
        provider = ManualProvider(output_dir=tmp_path)
        request = PromptRequest(
            stage_id="01",
            stage_title="Test",
            sequence_name="test",
            target_repo=".",
            previous_stages=[],
            prompt_content="Do something",
            repo_context="Repo info",
        )

        with (
            patch("builtins.input", side_effect=[EOFError]),
            patch("promptflow.providers.manual.console"),
            pytest.raises(ProviderError, match="No response provided"),
        ):
            provider.complete(request)
