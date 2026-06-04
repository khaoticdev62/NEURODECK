"""OpenAI provider adapter."""

from __future__ import annotations

from promptflow.config import Config
from promptflow.errors import ProviderError
from promptflow.models import PromptRequest, PromptResponse
from promptflow.providers.base import AIProvider


class OpenAIProvider(AIProvider):
    """OpenAI API provider."""

    name = "openai"

    def __init__(self, config: Config) -> None:
        self.config = config
        try:
            import openai
        except ImportError as exc:
            raise ProviderError(
                "OpenAI provider requires the 'openai' package.",
                details="Install it with: pip install promptflow[openai]",
            ) from exc
        api_key = openai.api_key or __import__("os").environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ProviderError(
                "OpenAI API key not found.",
                details="Set the OPENAI_API_KEY environment variable.",
            )
        self.client = openai.OpenAI(api_key=api_key)
        self.model = config.provider_model or "gpt-4o"

    def complete(self, request: PromptRequest) -> PromptResponse:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a senior software engineer."},
                    {"role": "user", "content": request.to_markdown()},
                ],
                timeout=self.config.provider_timeout_seconds,
            )
            content = response.choices[0].message.content or ""
            return self._make_response(request, content)
        except Exception as exc:
            raise ProviderError(f"OpenAI request failed: {exc}") from exc
