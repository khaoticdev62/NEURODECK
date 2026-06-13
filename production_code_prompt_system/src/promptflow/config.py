"""Configuration loading, validation, and defaults for PromptFlow."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from promptflow.errors import ConfigError

DEFAULT_CONFIG: dict[str, Any] = {
    "prompt_pack": "./prompts",
    "target_repo": ".",
    "output_dir": "./promptflow_runs",
    "provider": {
        "name": "manual",
        "model": None,
        "timeout_seconds": 120,
        "max_retries": 2,
    },
    "workflow": {
        "sequence": "full",
        "stop_on_blocker": True,
        "mode": "report-only",
        "include_orchestration": True,
        "require_approval_for_patches": True,
    },
    "context": {
        "max_context_files": 80,
        "max_file_bytes": 200_000,
        "include_git_status": True,
        "respect_gitignore": True,
        "redact_secrets": True,
        "exclude": [
            ".git",
            "node_modules",
            "dist",
            "build",
            "target",
            "coverage",
        ],
    },
    "commands": {
        "allow_verification_commands": True,
        "require_confirmation_for_commands": True,
        "timeout_seconds": 300,
    },
    "reports": {
        "generate_summary": True,
        "generate_blockers": True,
        "generate_warnings": True,
        "generate_next_actions": True,
    },
}


class Config:
    """Typed wrapper around the raw configuration dictionary."""

    def __init__(self, data: dict[str, Any], path: Path | None = None) -> None:
        self._data = data
        self._path = path

    @classmethod
    def load(cls, path: Path | str) -> Config:
        """Load configuration from a YAML file."""
        p = Path(path)
        if not p.exists():
            raise ConfigError(f"Config file not found: {p}")
        try:
            with p.open("r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
        except yaml.YAMLError as exc:
            raise ConfigError(f"Invalid YAML in config file: {exc}") from exc
        if not isinstance(data, dict):
            raise ConfigError("Config file must contain a top-level mapping.")
        merged = cls._merge_defaults(DEFAULT_CONFIG, data)
        cls._validate(merged)
        return cls(merged, path=p)

    @classmethod
    def default(cls) -> Config:
        """Return a default configuration instance."""
        return cls(DEFAULT_CONFIG.copy())

    def save(self, path: Path | str) -> None:
        """Save the current configuration to a YAML file."""
        p = Path(path)
        with p.open("w", encoding="utf-8") as f:
            yaml.safe_dump(self._data, f, default_flow_style=False, sort_keys=False)

    @staticmethod
    def _merge_defaults(defaults: Any, overrides: Any) -> Any:
        """Deep-merge overrides into defaults."""
        if isinstance(defaults, dict) and isinstance(overrides, dict):
            result = dict(defaults)
            for key, value in overrides.items():
                result[key] = Config._merge_defaults(result.get(key), value)
            return result
        return overrides

    @staticmethod
    def _validate(data: dict[str, Any]) -> None:
        """Validate required fields and types."""
        required_top = ["prompt_pack", "target_repo", "output_dir"]
        for key in required_top:
            if key not in data:
                raise ConfigError(f"Missing required config key: {key}")

        provider = data.get("provider", {})
        if not isinstance(provider, dict):
            raise ConfigError("'provider' must be a mapping.")
        if provider.get("name") not in {
            "manual",
            "openai",
            "anthropic",
            "gemini",
            "ollama",
        }:
            raise ConfigError(
                "'provider.name' must be one of: manual, openai, anthropic, gemini, ollama"
            )

        workflow = data.get("workflow", {})
        if not isinstance(workflow, dict):
            raise ConfigError("'workflow' must be a mapping.")
        if workflow.get("mode") not in {"report-only", "patch-review", "apply-patch"}:
            raise ConfigError(
                "'workflow.mode' must be one of: report-only, patch-review, apply-patch"
            )

    # Convenience accessors
    @property
    def prompt_pack(self) -> str:
        return str(self._data.get("prompt_pack", DEFAULT_CONFIG["prompt_pack"]))

    @property
    def target_repo(self) -> str:
        return str(self._data.get("target_repo", DEFAULT_CONFIG["target_repo"]))

    @property
    def output_dir(self) -> str:
        return str(self._data.get("output_dir", DEFAULT_CONFIG["output_dir"]))

    @property
    def provider_name(self) -> str:
        return str(self._data.get("provider", {}).get("name", "manual"))

    @property
    def provider_model(self) -> str | None:
        return self._data.get("provider", {}).get("model")  # type: ignore[no-any-return]

    @property
    def provider_timeout_seconds(self) -> int:
        return int(self._data.get("provider", {}).get("timeout_seconds", 120))

    @property
    def provider_max_retries(self) -> int:
        return int(self._data.get("provider", {}).get("max_retries", 2))

    @property
    def workflow_sequence(self) -> str:
        return str(self._data.get("workflow", {}).get("sequence", "full"))

    @property
    def custom_sequences(self) -> dict[str, list[str]] | None:
        seqs = self._data.get("sequences")
        if isinstance(seqs, dict):
            return {str(k): [str(i) for i in v] for k, v in seqs.items() if isinstance(v, list)}
        return None

    @property
    def workflow_stop_on_blocker(self) -> bool:
        return bool(self._data.get("workflow", {}).get("stop_on_blocker", True))

    @property
    def workflow_mode(self) -> str:
        return str(self._data.get("workflow", {}).get("mode", "report-only"))

    @property
    def workflow_include_orchestration(self) -> bool:
        return bool(self._data.get("workflow", {}).get("include_orchestration", True))

    @property
    def workflow_require_approval_for_patches(self) -> bool:
        return bool(self._data.get("workflow", {}).get("require_approval_for_patches", True))

    @property
    def context_max_context_files(self) -> int:
        return int(self._data.get("context", {}).get("max_context_files", 80))

    @property
    def context_max_file_bytes(self) -> int:
        return int(self._data.get("context", {}).get("max_file_bytes", 200_000))

    @property
    def context_include_git_status(self) -> bool:
        return bool(self._data.get("context", {}).get("include_git_status", True))

    @property
    def context_respect_gitignore(self) -> bool:
        return bool(self._data.get("context", {}).get("respect_gitignore", True))

    @property
    def context_redact_secrets(self) -> bool:
        return bool(self._data.get("context", {}).get("redact_secrets", True))

    @property
    def context_exclude(self) -> list[str]:
        return list(self._data.get("context", {}).get("exclude", []))

    @property
    def commands_allow_verification_commands(self) -> bool:
        return bool(self._data.get("commands", {}).get("allow_verification_commands", True))

    @property
    def commands_require_confirmation(self) -> bool:
        return bool(self._data.get("commands", {}).get("require_confirmation_for_commands", True))

    @property
    def commands_timeout_seconds(self) -> int:
        return int(self._data.get("commands", {}).get("timeout_seconds", 300))

    @property
    def reports_generate_summary(self) -> bool:
        return bool(self._data.get("reports", {}).get("generate_summary", True))

    @property
    def reports_generate_blockers(self) -> bool:
        return bool(self._data.get("reports", {}).get("generate_blockers", True))

    @property
    def reports_generate_warnings(self) -> bool:
        return bool(self._data.get("reports", {}).get("generate_warnings", True))

    @property
    def reports_generate_next_actions(self) -> bool:
        return bool(self._data.get("reports", {}).get("generate_next_actions", True))

    def to_dict(self) -> dict[str, Any]:
        return dict(self._data)
