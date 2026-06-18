"""AI provider registration and factory."""

from __future__ import annotations

from promptflow.config import Config
from promptflow.errors import ProviderError
from promptflow.providers.base import AIProvider
from promptflow.providers.manual import ManualProvider


def get_provider(config: Config) -> AIProvider:
    """Return an initialized provider based on config."""
    name = config.provider_name
    if name == "manual":
        return ManualProvider()
    if name == "openai":
        from promptflow.providers.openai_provider import OpenAIProvider

        return OpenAIProvider(config)
    if name == "anthropic":
        from promptflow.providers.anthropic_provider import AnthropicProvider

        return AnthropicProvider(config)
    if name == "gemini":
        from promptflow.providers.gemini_provider import GeminiProvider

        return GeminiProvider(config)
    if name == "ollama":
        from promptflow.providers.ollama_provider import OllamaProvider

        return OllamaProvider(config)
    raise ProviderError(f"Unknown provider: {name}")
