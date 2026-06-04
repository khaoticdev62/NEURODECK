"""Manual provider — works fully without API keys."""

from __future__ import annotations

from pathlib import Path

from rich.console import Console
from rich.panel import Panel

from promptflow.errors import ProviderError
from promptflow.models import PromptRequest, PromptResponse
from promptflow.providers.base import AIProvider

console = Console()


class ManualProvider(AIProvider):
    """Provider that writes payloads to disk and prompts the user for responses."""

    name = "manual"

    def __init__(self, output_dir: Path | None = None) -> None:
        self.output_dir = output_dir

    def complete(self, request: PromptRequest) -> PromptResponse:
        """Write the payload to a markdown file and prompt user for response."""
        payload = request.to_markdown()
        payload_path: Path | None = None

        if self.output_dir is not None:
            payload_dir = self.output_dir / "prompts"
            payload_dir.mkdir(parents=True, exist_ok=True)
            payload_path = payload_dir / f"{request.stage_id}_payload.md"
            payload_path.write_text(payload, encoding="utf-8")

        console.print()
        console.print(
            Panel.fit(
                f"[bold blue]Stage {request.stage_id}[/bold blue]: {request.stage_title}\n"
                f"Payload size: {len(payload)} characters",
                title="Manual Mode",
                border_style="blue",
            )
        )

        if payload_path:
            console.print(f"[dim]Payload saved to:[/dim] {payload_path}")

        console.print(
            "\n[bold yellow]Instructions:[/bold yellow]\n"
            "1. Copy the payload above (or from the saved file) into your AI tool.\n"
            "2. Paste the AI's response below, or provide a path to a response file.\n"
        )

        response_text = self._read_user_input()
        if not response_text.strip():
            raise ProviderError(
                "No response provided for manual mode.",
                details="Paste the AI response or provide a file path.",
            )

        return self._make_response(request, response_text)

    def _read_user_input(self) -> str:
        """Read multi-line input from user until EOF (Ctrl+D / Ctrl+Z) or file path."""
        console.print(
            "[dim]Enter response text (Ctrl+Z then Enter on Windows, Ctrl+D on Unix to finish),[/dim]"
        )
        console.print("[dim]or type a file path to load from:[/dim]")
        lines: list[str] = []
        try:
            while True:
                line = input()
                # If the first line looks like a path, check it
                if len(lines) == 0 and not line.strip().startswith("-") and (
                    line.strip().endswith(".md") or line.strip().endswith(".txt")
                ):
                    path = Path(line.strip())
                    if path.exists():
                        console.print(f"[green]Loading response from {path}[/green]")
                        return path.read_text(encoding="utf-8")
                lines.append(line)
        except EOFError:
            pass
        except KeyboardInterrupt:
            console.print("\n[yellow]Input cancelled.[/yellow]")
            return ""
        return "\n".join(lines)
