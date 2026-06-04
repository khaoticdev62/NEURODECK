"""Custom exceptions for PromptFlow."""


class PromptFlowError(Exception):
    """Base exception for all PromptFlow errors."""

    def __init__(self, message: str, *, details: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class PromptPackError(PromptFlowError):
    """Raised when prompt pack discovery or validation fails."""


class ConfigError(PromptFlowError):
    """Raised when config loading or validation fails."""


class ProviderError(PromptFlowError):
    """Raised when an AI provider operation fails."""


class RepoInspectionError(PromptFlowError):
    """Raised when repository inspection fails."""


class StateError(PromptFlowError):
    """Raised when state persistence or resume logic fails."""


class SafetyError(PromptFlowError):
    """Raised when a safety check blocks an operation."""


class CommandExecutionError(PromptFlowError):
    """Raised when a safe command execution fails."""


class ReportError(PromptFlowError):
    """Raised when report generation fails."""
