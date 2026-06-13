"""Tests for configuration loading and validation."""

from pathlib import Path

import pytest

from promptflow.config import DEFAULT_CONFIG, Config
from promptflow.errors import ConfigError


class TestConfig:
    def test_default_config(self) -> None:
        cfg = Config.default()
        assert cfg.prompt_pack == "./prompts"
        assert cfg.target_repo == "."
        assert cfg.provider_name == "manual"
        assert cfg.workflow_sequence == "full"
        assert cfg.workflow_stop_on_blocker is True

    def test_load_valid_config(self, tmp_path: Path) -> None:
        config_path = tmp_path / "promptflow.yaml"
        config_path.write_text("prompt_pack: ./prompts\ntarget_repo: ./repo\noutput_dir: ./runs\n")
        cfg = Config.load(config_path)
        assert cfg.prompt_pack == "./prompts"
        assert cfg.target_repo == "./repo"

    def test_load_invalid_yaml(self, tmp_path: Path) -> None:
        config_path = tmp_path / "promptflow.yaml"
        config_path.write_text("not: valid: yaml: [")
        with pytest.raises(ConfigError):
            Config.load(config_path)

    def test_merge_defaults(self, tmp_path: Path) -> None:
        config_path = tmp_path / "promptflow.yaml"
        config_path.write_text("target_repo: ./my_repo\n")
        cfg = Config.load(config_path)
        # Missing keys are filled from defaults
        assert cfg.prompt_pack == DEFAULT_CONFIG["prompt_pack"]
        assert cfg.target_repo == "./my_repo"

    def test_invalid_provider_name(self, tmp_path: Path) -> None:
        config_path = tmp_path / "promptflow.yaml"
        config_path.write_text(
            "prompt_pack: .\ntarget_repo: .\noutput_dir: .\nprovider:\n  name: fake_provider\n"
        )
        with pytest.raises(ConfigError, match="provider.name"):
            Config.load(config_path)

    def test_invalid_workflow_mode(self, tmp_path: Path) -> None:
        config_path = tmp_path / "promptflow.yaml"
        config_path.write_text(
            "prompt_pack: .\ntarget_repo: .\noutput_dir: .\nworkflow:\n  mode: destroy\n"
        )
        with pytest.raises(ConfigError, match="workflow.mode"):
            Config.load(config_path)

    def test_save_and_reload(self, tmp_path: Path) -> None:
        config_path = tmp_path / "promptflow.yaml"
        cfg = Config.default()
        cfg.save(config_path)
        assert config_path.exists()
        reloaded = Config.load(config_path)
        assert reloaded.provider_name == cfg.provider_name
