"""Base AI provider abstraction."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime

from promptflow.models import PromptRequest, PromptResponse


class AIProvider(ABC):
    """Abstract base class for AI providers."""

    name: str = "abstract"

    @abstractmethod
    def complete(self, request: PromptRequest) -> PromptResponse:
        """Send a request and return the response."""
        ...

    def _make_response(self, request: PromptRequest, content: str) -> PromptResponse:
        """Helper to create a PromptResponse with common fields."""
        return PromptResponse(
            stage_id=request.stage_id,
            content=content,
            provider=self.name,
            finished_at=datetime.now(),
        )
