"""Gemini (Google Generative AI) provider adapter."""

from __future__ import annotations

from promptflow.config import Config
from promptflow.errors import ProviderError
from promptflow.models import PromptRequest, PromptResponse
from promptflow.providers.base import AIProvider


class GeminiProvider(AIProvider):
    """Google Gemini API provider."""

    name = "gemini"

    def __init__(self, config: Config) -> None:
        self.config = config
        try:
            import google.generativeai as genai
        except ImportError as exc:
            raise ProviderError(
                "Gemini provider requires the 'google-generativeai' package.",
                details="Install it with: pip install promptflow[gemini]",
            ) from exc
        api_key = __import__("os").environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ProviderError(
                "Google API key not found.",
                details="Set the GOOGLE_API_KEY environment variable.",
            )
        genai.configure(api_key=api_key)
        self.model = config.provider_model or "gemini-1.5-flash"
        self.client = genai.GenerativeModel(self.model)

    def complete(self, request: PromptRequest) -> PromptResponse:
        try:
            response = self.client.generate_content(request.to_markdown())
            content = response.text or ""
            return self._make_response(request, content)
        except Exception as exc:
            raise ProviderError(f"Gemini request failed: {exc}") from exc
