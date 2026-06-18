"""Anthropic provider adapter."""

from __future__ import annotations

from promptflow.config import Config
from promptflow.errors import ProviderError
from promptflow.models import PromptRequest, PromptResponse
from promptflow.providers.base import AIProvider


class AnthropicProvider(AIProvider):
    """Anthropic API provider."""

    name = "anthropic"

    def __init__(self, config: Config) -> None:
        self.config = config
        try:
            import anthropic
        except ImportError as exc:
            raise ProviderError(
                "Anthropic provider requires the 'anthropic' package.",
                details="Install it with: pip install promptflow[anthropic]",
            ) from exc
        api_key = __import__("os").environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ProviderError(
                "Anthropic API key not found.",
                details="Set the ANTHROPIC_API_KEY environment variable.",
            )
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = config.provider_model or "claude-3-5-sonnet-latest"

    def complete(self, request: PromptRequest) -> PromptResponse:
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                messages=[{"role": "user", "content": request.to_markdown()}],
                timeout=self.config.provider_timeout_seconds,
            )
            # Anthropic returns content blocks
            blocks = response.content
            content = ""
            if isinstance(blocks, list):
                content = "".join(block.text for block in blocks if hasattr(block, "text"))
            else:
                content = str(blocks)
            return self._make_response(request, content)
        except Exception as exc:
            raise ProviderError(f"Anthropic request failed: {exc}") from exc
