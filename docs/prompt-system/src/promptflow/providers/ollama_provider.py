"""Ollama local provider adapter."""

from __future__ import annotations

from promptflow.config import Config
from promptflow.errors import ProviderError
from promptflow.models import PromptRequest, PromptResponse
from promptflow.providers.base import AIProvider


class OllamaProvider(AIProvider):
    """Ollama local API provider."""

    name = "ollama"

    def __init__(self, config: Config) -> None:
        self.config = config
        self.base_url = "http://localhost:11434"
        self.model = config.provider_model or "llama3.1"

    def complete(self, request: PromptRequest) -> PromptResponse:
        try:
            import httpx
        except ImportError as exc:
            raise ProviderError(
                "Ollama provider requires 'httpx'.",
                details="Install it with: pip install promptflow[ollama]",
            ) from exc

        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": request.to_markdown(),
            "stream": False,
        }
        try:
            resp = httpx.post(
                url,
                json=payload,
                timeout=self.config.provider_timeout_seconds,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("response", "")
            return self._make_response(request, content)
        except httpx.ConnectError as exc:
            raise ProviderError(
                "Could not connect to Ollama.",
                details="Make sure Ollama is running on localhost:11434.",
            ) from exc
        except Exception as exc:
            raise ProviderError(f"Ollama request failed: {exc}") from exc
