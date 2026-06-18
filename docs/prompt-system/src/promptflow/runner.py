"""Workflow runner — orchestrates stage-by-stage execution."""

from __future__ import annotations

import logging
from pathlib import Path

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

from promptflow.config import Config
from promptflow.context_builder import build_context
from promptflow.errors import PromptFlowError
from promptflow.logging_config import log_stage_transition
from promptflow.models import Prompt, PromptRequest, RunState, RunStatus
from promptflow.providers import get_provider
from promptflow.state import StateManager

console = Console()
logger = logging.getLogger("promptflow")

BLOCKER_KEYWORDS = [
    "release blocked",
    "blocked",
    "critical",
    "high severity",
    "cannot continue",
    "missing command",
    "build fails",
    "tests fail",
    "security risk",
    "secrets exposed",
    "data loss risk",
    "migration unsafe",
]


class WorkflowRunner:
    """Runs a sequence of prompt stages against a repository."""

    def __init__(
        self,
        config: Config,
        prompts: list[Prompt],
        state_manager: StateManager,
        run_dir: Path,
        state: RunState,
    ) -> None:
        self.config = config
        self.prompts = {p.stage_id: p for p in prompts}
        self.state_manager = state_manager
        self.run_dir = run_dir
        self.state = state
        self.provider = get_provider(config)
        self.dry_run = False

    def run_sequence(
        self,
        sequence: list[Prompt],
        resume: bool = False,
        dry_run: bool = False,
    ) -> RunState:
        """Execute a sequence of prompts."""
        self.dry_run = dry_run
        self.state.status = RunStatus.RUNNING.value
        self.state_manager.save(self.state, self.run_dir)

        # Determine starting point for resume
        stages_to_run = list(sequence)
        if resume:
            completed = set(self.state.completed_stages)
            stages_to_run = [s for s in sequence if s.stage_id not in completed]
            if not stages_to_run:
                console.print("[green]All stages already completed.[/green]")
                self.state.status = RunStatus.COMPLETED.value
                self.state_manager.save(self.state, self.run_dir)
                return self.state

        logger.info(f"Starting sequence with {len(stages_to_run)} stage(s)")

        for prompt in stages_to_run:
            self._run_stage(prompt)
            if self.state.status in {RunStatus.BLOCKED.value, RunStatus.FAILED.value}:
                break

        if self.state.status == RunStatus.RUNNING.value:
            self.state.status = RunStatus.COMPLETED.value

        self.state_manager.save(self.state, self.run_dir)
        return self.state

    def run_single_stage(self, stage_id: str, dry_run: bool = False) -> RunState:
        """Run a single stage by ID."""
        self.dry_run = dry_run
        if stage_id not in self.prompts:
            raise PromptFlowError(f"Stage '{stage_id}' not found in prompt pack.")
        self.state.status = RunStatus.RUNNING.value
        self.state_manager.save(self.state, self.run_dir)
        self._run_stage(self.prompts[stage_id])
        self.state_manager.save(self.state, self.run_dir)
        return self.state

    def _run_stage(self, prompt: Prompt) -> None:
        """Execute one stage."""
        self.state.current_stage = prompt.stage_id
        self.state_manager.save(self.state, self.run_dir)

        log_stage_transition(
            logger,
            prompt.stage_id,
            "started",
            title=prompt.title,
            provider=self.config.provider_name,
        )

        try:
            prompt_content = prompt.file_path.read_text(encoding="utf-8")
        except OSError as exc:
            raise PromptFlowError(f"Cannot read prompt file: {exc}") from exc

        # Build context
        previous_outputs = self._load_previous_outputs()
        repo_context = build_context(
            self.config.target_repo,
            self.config,
            previous_outputs=previous_outputs,
        )

        request = PromptRequest(
            stage_id=prompt.stage_id,
            stage_title=prompt.title,
            sequence_name=self.state.sequence,
            target_repo=self.config.target_repo,
            previous_stages=self.state.completed_stages,
            prompt_content=prompt_content,
            repo_context=repo_context,
            previous_outputs=previous_outputs,
        )

        # Save payload
        payload_path = self.run_dir / "prompts" / f"{prompt.stage_id}_payload.md"
        payload_path.write_text(request.to_markdown(), encoding="utf-8")
        logger.info(f"Payload saved: {payload_path}")

        if self.dry_run:
            console.print(f"[dim]Dry run: would execute stage {prompt.stage_id}[/dim]")
            self.state.completed_stages.append(prompt.stage_id)
            self.state_manager.save(self.state, self.run_dir)
            return

        # Send to provider
        if hasattr(self.provider, "output_dir"):
            self.provider.output_dir = self.run_dir

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            progress.add_task(
                description=f"Running stage {prompt.stage_id} ({prompt.title})...",
                total=None,
            )
            try:
                response = self.provider.complete(request)
            except PromptFlowError:
                raise
            except Exception as exc:
                raise PromptFlowError(f"Provider error in stage {prompt.stage_id}: {exc}") from exc

        # Save response
        response_path = self.run_dir / "responses" / f"{prompt.stage_id}_response.md"
        response_path.write_text(response.content, encoding="utf-8")
        logger.info(f"Response saved: {response_path}")

        # Detect blockers
        blockers = self._detect_blockers(response.content)
        if blockers:
            for b in blockers:
                logger.warning(f"Blocker detected in stage {prompt.stage_id}: {b}")
            self.state.blockers.extend(blockers)
            if self.config.workflow_stop_on_blocker:
                self.state.status = RunStatus.BLOCKED.value
                console.print(
                    f"[bold red]Workflow stopped because blocker was detected in stage {prompt.stage_id}.[/bold red]"
                )
                return

        self.state.completed_stages.append(prompt.stage_id)
        log_stage_transition(logger, prompt.stage_id, "completed", title=prompt.title)
        self.state_manager.save(self.state, self.run_dir)

    def _load_previous_outputs(self) -> dict[str, str]:
        """Load outputs from previously completed stages."""
        outputs: dict[str, str] = {}
        for stage_id in self.state.completed_stages:
            path = self.run_dir / "responses" / f"{stage_id}_response.md"
            if path.exists():
                outputs[stage_id] = path.read_text(encoding="utf-8")
        return outputs

    def _detect_blockers(self, text: str) -> list[str]:
        """Scan response text for blocker keywords."""
        lowered = text.lower()
        found: list[str] = []
        for keyword in BLOCKER_KEYWORDS:
            if keyword in lowered:
                found.append(keyword)
        return found
