"""PromptFlow CLI application."""

from __future__ import annotations

import logging
import shutil
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Annotated, Any

import typer
from rich.console import Console
from rich.table import Table

from promptflow.config import Config
from promptflow.context_builder import build_context
from promptflow.errors import PromptFlowError
from promptflow.logging_config import setup_logging
from promptflow.models import RunStatus
from promptflow.prompts import discover_prompts
from promptflow.reports import ReportGenerator
from promptflow.runner import WorkflowRunner
from promptflow.sequences import resolve_sequence
from promptflow.state import StateManager

app = typer.Typer(
    name="promptflow",
    help="Professional CLI workflow runner for the Production Code Prompt System",
    no_args_is_help=True,
)
console = Console()

DEFAULT_CONFIG_PATH = Path("promptflow.yaml")


def _load_config(path: Path | None) -> Config:
    if path is None:
        path = DEFAULT_CONFIG_PATH
    if not path.exists():
        raise PromptFlowError(
            f"Config file not found: {path}",
            details="Run 'promptflow init' to create one.",
        )
    return Config.load(path)


def _load_prompts(cfg: Config) -> list[Any]:
    return discover_prompts(cfg.prompt_pack)


@app.callback()
def main(
    ctx: typer.Context,
    config: Annotated[
        Path | None, typer.Option("--config", "-c", help="Path to config file")
    ] = None,
    debug: Annotated[bool, typer.Option("--debug", help="Enable debug output")] = False,
) -> None:
    """PromptFlow — run production code prompts against your repository."""
    ctx.ensure_object(dict)
    ctx.obj["config_path"] = config
    ctx.obj["debug"] = debug


@app.command()
def init(
    ctx: typer.Context,
    force: Annotated[bool, typer.Option("--force", "-f", help="Overwrite existing config")] = False,
) -> None:
    """Create a local promptflow.yaml config file."""
    path = DEFAULT_CONFIG_PATH
    if path.exists() and not force:
        console.print(f"[yellow]Config already exists:[/yellow] {path}")
        console.print("Use --force to overwrite.")
        raise typer.Exit(code=1)

    cfg = Config.default()
    cfg.save(path)
    console.print(f"[green]{path} created.[/green]")


@app.command()
def doctor(
    ctx: typer.Context,
    config: Annotated[Path | None, typer.Option("--config", "-c")] = None,
) -> None:
    """Validate environment and project setup."""
    cfg_path = config or ctx.obj.get("config_path") or DEFAULT_CONFIG_PATH
    issues: list[str] = []
    checks_passed = 0

    # Python version
    import platform

    py_version = platform.python_version()
    console.print(f"Python version: {py_version}")
    checks_passed += 1

    # Config file
    if cfg_path.exists():
        console.print(f"Config file: [green]{cfg_path} exists[/green]")
        try:
            cfg = Config.load(cfg_path)
            checks_passed += 1
        except PromptFlowError as exc:
            issues.append(f"Config invalid: {exc.message}")
            console.print(f"Config file: [red]invalid[/red] — {exc.message}")
    else:
        issues.append(f"Config file missing: {cfg_path}")
        console.print(f"Config file: [red]{cfg_path} missing[/red]")

    # Prompt pack
    if cfg_path.exists():
        cfg = Config.load(cfg_path)
        pack_path = Path(cfg.prompt_pack)
        if pack_path.exists():
            try:
                discover_prompts(pack_path)
                console.print(f"Prompt pack: [green]{pack_path} valid[/green]")
                checks_passed += 1
            except PromptFlowError as exc:
                issues.append(f"Prompt pack issue: {exc.message}")
                console.print(f"Prompt pack: [red]{pack_path} invalid[/red] — {exc.message}")
        else:
            issues.append(f"Prompt pack missing: {pack_path}")
            console.print(f"Prompt pack: [red]{pack_path} missing[/red]")

        # Target repo
        repo_path = Path(cfg.target_repo)
        if repo_path.exists():
            console.print(f"Target repo: [green]{repo_path} exists[/green]")
            checks_passed += 1
        else:
            issues.append(f"Target repo missing: {repo_path}")
            console.print(f"Target repo: [red]{repo_path} missing[/red]")

        # Output dir writable
        out_path = Path(cfg.output_dir)
        try:
            out_path.mkdir(parents=True, exist_ok=True)
            test_file = out_path / ".promptflow_write_test"
            test_file.write_text("ok")
            test_file.unlink()
            console.print(f"Output dir: [green]{out_path} writable[/green]")
            checks_passed += 1
        except OSError as exc:
            issues.append(f"Output dir not writable: {exc}")
            console.print(f"Output dir: [red]{out_path} not writable[/red]")

    # Git availability
    if shutil.which("git"):
        console.print("Git: [green]available[/green]")
        checks_passed += 1
    else:
        console.print("Git: [yellow]not found[/yellow] (optional)")

    console.print()
    if issues:
        console.print(f"[bold red]Issues found ({len(issues)}):[/bold red]")
        for issue in issues:
            console.print(f"  - {issue}")
        raise typer.Exit(code=1)
    else:
        console.print(f"[bold green]All checks passed ({checks_passed} checks).[/bold green]")


@app.command(name="list-prompts")
def list_prompts(
    ctx: typer.Context,
    config: Annotated[Path | None, typer.Option("--config", "-c")] = None,
) -> None:
    """List detected prompts in execution order."""
    cfg_path = config or ctx.obj.get("config_path") or DEFAULT_CONFIG_PATH
    cfg = _load_config(cfg_path)
    prompts = _load_prompts(cfg)

    table = Table(title="Detected Prompts")
    table.add_column("Order", style="cyan", no_wrap=True)
    table.add_column("ID", style="magenta", no_wrap=True)
    table.add_column("Title", style="green")
    table.add_column("File", style="dim")
    table.add_column("Status", style="yellow")

    for p in prompts:
        table.add_row(str(p.order), p.stage_id, p.title, p.file_path.name, "ready")

    console.print(table)


@app.command(name="inspect-repo")
def inspect_repo_cmd(
    ctx: typer.Context,
    repo: Annotated[str, typer.Option("--repo", "-r", help="Path to target repository")] = ".",
    config: Annotated[Path | None, typer.Option("--config", "-c")] = None,
) -> None:
    """Create a safe repository summary without calling an AI provider."""
    cfg_path = config or ctx.obj.get("config_path") or DEFAULT_CONFIG_PATH
    cfg = _load_config(cfg_path)

    try:
        summary = build_context(repo, cfg)
    except PromptFlowError as exc:
        console.print(f"[red]Error:[/red] {exc.message}")
        raise typer.Exit(code=1) from exc

    console.print(summary)


@app.command()
def run(
    ctx: typer.Context,
    repo: Annotated[str | None, typer.Option("--repo", "-r")] = None,
    prompt_pack: Annotated[str | None, typer.Option("--prompt-pack")] = None,
    sequence: Annotated[str | None, typer.Option("--sequence", "-s")] = None,
    from_stage: Annotated[str | None, typer.Option("--from")] = None,
    to_stage: Annotated[str | None, typer.Option("--to")] = None,
    only: Annotated[str | None, typer.Option("--only")] = None,
    resume: Annotated[bool, typer.Option("--resume")] = False,
    dry_run: Annotated[bool, typer.Option("--dry-run")] = False,
    provider: Annotated[str | None, typer.Option("--provider")] = None,
    allow_missing_prompts: Annotated[bool, typer.Option("--allow-missing-prompts")] = False,
    continue_on_blocker: Annotated[bool, typer.Option("--continue-on-blocker")] = False,
    config: Annotated[Path | None, typer.Option("--config", "-c")] = None,
) -> None:
    """Run the workflow."""
    cfg_path = config or ctx.obj.get("config_path") or DEFAULT_CONFIG_PATH
    cfg = _load_config(cfg_path)
    debug = ctx.obj.get("debug", False)

    if repo:
        cfg._data["target_repo"] = repo
    if prompt_pack:
        cfg._data["prompt_pack"] = prompt_pack
    if sequence:
        cfg._data["workflow"] = cfg._data.get("workflow", {})
        cfg._data["workflow"]["sequence"] = sequence
    if provider:
        cfg._data["provider"] = cfg._data.get("provider", {})
        cfg._data["provider"]["name"] = provider
    if continue_on_blocker:
        cfg._data["workflow"] = cfg._data.get("workflow", {})
        cfg._data["workflow"]["stop_on_blocker"] = False

    log_file = Path(cfg.output_dir) / "logs" / "run.log"
    setup_logging(level=logging.DEBUG if debug else logging.INFO, log_file=log_file)

    try:
        prompts = discover_prompts(cfg.prompt_pack)
    except PromptFlowError as exc:
        if allow_missing_prompts:
            console.print(f"[yellow]Warning: {exc.message}[/yellow]")
            prompts = []
        else:
            console.print(f"[red]Error:[/red] {exc.message}")
            raise typer.Exit(code=1) from exc

    seq_name = cfg.workflow_sequence
    try:
        sequence_prompts = resolve_sequence(
            seq_name,
            prompts,
            custom_sequences=cfg.custom_sequences,
            include_orchestration=cfg.workflow_include_orchestration,
            from_stage=from_stage,
            to_stage=to_stage,
            only_stage=only,
        )
    except PromptFlowError as exc:
        console.print(f"[red]Error:[/red] {exc.message}")
        raise typer.Exit(code=1) from exc

    state_manager = StateManager(cfg.output_dir)

    if resume:
        latest = state_manager.find_latest_run()
        if latest is None:
            console.print("[red]No previous run found to resume.[/red]")
            raise typer.Exit(code=1)
        run_dir = latest
        state = state_manager.load(run_dir)
        console.print(f"[green]Resuming run:[/green] {state.run_id}")
    else:
        state, run_dir = state_manager.create_run(
            sequence=seq_name,
            target_repo=cfg.target_repo,
            prompt_pack=cfg.prompt_pack,
            provider=cfg.provider_name,
            model=cfg.provider_model,
        )
        # Save config snapshot
        config_snapshot = run_dir / "config_snapshot.yaml"
        Config(cfg.to_dict()).save(config_snapshot)
        console.print(f"[green]Created run:[/green] {state.run_id}")

    runner = WorkflowRunner(cfg, prompts, state_manager, run_dir, state)
    try:
        final_state = runner.run_sequence(sequence_prompts, resume=resume, dry_run=dry_run)
    except PromptFlowError as exc:
        console.print(f"[red]Workflow failed:[/red] {exc.message}")
        if exc.details:
            console.print(f"[dim]{exc.details}[/dim]")
        raise typer.Exit(code=1) from exc

    console.print()
    if final_state.status == RunStatus.COMPLETED.value:
        console.print("[bold green]Workflow completed successfully.[/bold green]")
    elif final_state.status == RunStatus.BLOCKED.value:
        console.print("[bold yellow]Workflow blocked.[/bold yellow]")
    else:
        console.print(f"[bold red]Workflow ended with status: {final_state.status}[/bold red]")

    console.print(f"Run directory: {run_dir}")


@app.command()
def step(
    ctx: typer.Context,
    stage_id: str,
    repo: Annotated[str | None, typer.Option("--repo", "-r")] = None,
    prompt_pack: Annotated[str | None, typer.Option("--prompt-pack")] = None,
    provider: Annotated[str | None, typer.Option("--provider")] = None,
    dry_run: Annotated[bool, typer.Option("--dry-run")] = False,
    config: Annotated[Path | None, typer.Option("--config", "-c")] = None,
) -> None:
    """Run one prompt stage."""
    cfg_path = config or ctx.obj.get("config_path") or DEFAULT_CONFIG_PATH
    cfg = _load_config(cfg_path)
    debug = ctx.obj.get("debug", False)

    if repo:
        cfg._data["target_repo"] = repo
    if prompt_pack:
        cfg._data["prompt_pack"] = prompt_pack
    if provider:
        cfg._data["provider"] = cfg._data.get("provider", {})
        cfg._data["provider"]["name"] = provider

    log_file = Path(cfg.output_dir) / "logs" / "run.log"
    setup_logging(level=logging.DEBUG if debug else logging.INFO, log_file=log_file)

    try:
        prompts = discover_prompts(cfg.prompt_pack)
    except PromptFlowError as exc:
        console.print(f"[red]Error:[/red] {exc.message}")
        raise typer.Exit(code=1) from exc

    state_manager = StateManager(cfg.output_dir)
    state, run_dir = state_manager.create_run(
        sequence=f"step_{stage_id}",
        target_repo=cfg.target_repo,
        prompt_pack=cfg.prompt_pack,
        provider=cfg.provider_name,
        model=cfg.provider_model,
    )
    config_snapshot = run_dir / "config_snapshot.yaml"
    Config(cfg.to_dict()).save(config_snapshot)

    runner = WorkflowRunner(cfg, prompts, state_manager, run_dir, state)
    try:
        runner.run_single_stage(stage_id, dry_run=dry_run)
    except PromptFlowError as exc:
        console.print(f"[red]Stage failed:[/red] {exc.message}")
        raise typer.Exit(code=1) from exc

    console.print(f"[green]Stage {stage_id} completed.[/green]")
    console.print(f"Run directory: {run_dir}")


@app.command()
def resume(
    ctx: typer.Context,
    config: Annotated[Path | None, typer.Option("--config", "-c")] = None,
    dry_run: Annotated[bool, typer.Option("--dry-run")] = False,
) -> None:
    """Resume an interrupted workflow."""
    cfg_path = config or ctx.obj.get("config_path") or DEFAULT_CONFIG_PATH
    cfg = _load_config(cfg_path)
    debug = ctx.obj.get("debug", False)

    log_file = Path(cfg.output_dir) / "logs" / "run.log"
    setup_logging(level=logging.DEBUG if debug else logging.INFO, log_file=log_file)

    try:
        prompts = discover_prompts(cfg.prompt_pack)
    except PromptFlowError as exc:
        console.print(f"[red]Error:[/red] {exc.message}")
        raise typer.Exit(code=1) from exc

    state_manager = StateManager(cfg.output_dir)
    latest = state_manager.find_latest_run()
    if latest is None:
        console.print("[red]No previous run found to resume.[/red]")
        raise typer.Exit(code=1)

    run_dir = latest
    state = state_manager.load(run_dir)
    console.print(f"[green]Resuming run:[/green] {state.run_id}")

    seq_name = state.sequence
    try:
        sequence_prompts = resolve_sequence(
            seq_name,
            prompts,
            custom_sequences=cfg.custom_sequences,
            include_orchestration=True,
        )
    except PromptFlowError as exc:
        console.print(f"[red]Error:[/red] {exc.message}")
        raise typer.Exit(code=1) from exc

    runner = WorkflowRunner(cfg, prompts, state_manager, run_dir, state)
    try:
        final_state = runner.run_sequence(sequence_prompts, resume=True, dry_run=dry_run)
    except PromptFlowError as exc:
        console.print(f"[red]Workflow failed:[/red] {exc.message}")
        raise typer.Exit(code=1) from exc

    if final_state.status == RunStatus.COMPLETED.value:
        console.print("[bold green]Workflow completed successfully.[/bold green]")
    elif final_state.status == RunStatus.BLOCKED.value:
        console.print("[bold yellow]Workflow blocked.[/bold yellow]")
    else:
        console.print(f"[bold red]Workflow ended with status: {final_state.status}[/bold red]")

    console.print(f"Run directory: {run_dir}")


@app.command()
def report(
    ctx: typer.Context,
    run_id: Annotated[str, typer.Option("--run-id")] = "latest",
    config: Annotated[Path | None, typer.Option("--config", "-c")] = None,
) -> None:
    """Generate a consolidated report from all stage outputs."""
    cfg_path = config or ctx.obj.get("config_path") or DEFAULT_CONFIG_PATH
    cfg = _load_config(cfg_path)
    state_manager = StateManager(cfg.output_dir)

    if run_id == "latest":
        run_dir = state_manager.find_latest_run()
        if run_dir is None:
            console.print("[red]No runs found.[/red]")
            raise typer.Exit(code=1)
    else:
        run_dir = state_manager.get_run_dir(run_id)
        if not run_dir.exists():
            console.print(f"[red]Run not found: {run_id}[/red]")
            raise typer.Exit(code=1)

    state = state_manager.load(run_dir)
    generator = ReportGenerator(run_dir, state)
    paths = generator.generate_all()

    console.print("[green]Reports generated:[/green]")
    for name, path in paths.items():
        console.print(f"  {name}: {path}")


@app.command()
def export(
    ctx: typer.Context,
    run_id: Annotated[str, typer.Option("--run-id")] = "latest",
    format: Annotated[str, typer.Option("--format")] = "zip",
    config: Annotated[Path | None, typer.Option("--config", "-c")] = None,
) -> None:
    """Export a run package."""
    cfg_path = config or ctx.obj.get("config_path") or DEFAULT_CONFIG_PATH
    cfg = _load_config(cfg_path)
    state_manager = StateManager(cfg.output_dir)

    if run_id == "latest":
        run_dir = state_manager.find_latest_run()
        if run_dir is None:
            console.print("[red]No runs found.[/red]")
            raise typer.Exit(code=1)
    else:
        run_dir = state_manager.get_run_dir(run_id)
        if not run_dir.exists():
            console.print(f"[red]Run not found: {run_id}[/red]")
            raise typer.Exit(code=1)

    if format == "zip":
        zip_path = run_dir.with_suffix(".zip")
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for file_path in run_dir.rglob("*"):
                if file_path.is_file():
                    arcname = file_path.relative_to(run_dir)
                    zf.write(file_path, arcname)
        console.print(f"[green]Exported to:[/green] {zip_path}")
    else:
        console.print(f"[red]Unsupported format: {format}[/red]")
        raise typer.Exit(code=1)


@app.command()
def clean(
    ctx: typer.Context,
    older_than: Annotated[str | None, typer.Option("--older-than")] = None,
    keep: Annotated[
        int | None, typer.Option("--keep", help="Number of recent runs to keep")
    ] = None,
    config: Annotated[Path | None, typer.Option("--config", "-c")] = None,
) -> None:
    """Safely remove old run outputs."""
    cfg_path = config or ctx.obj.get("config_path") or DEFAULT_CONFIG_PATH
    cfg = _load_config(cfg_path)
    state_manager = StateManager(cfg.output_dir)
    runs = state_manager.list_runs()

    if not runs:
        console.print("No runs to clean.")
        return

    to_remove: list[Path] = []

    if keep is not None:
        to_remove = runs[keep:]
    elif older_than:
        # Parse duration like "30d"
        if older_than.endswith("d"):
            days = int(older_than[:-1])
            cutoff = datetime.now() - timedelta(days=days)
            for run_dir in runs:
                try:
                    mtime = datetime.fromtimestamp(run_dir.stat().st_mtime)
                    if mtime < cutoff:
                        to_remove.append(run_dir)
                except OSError:
                    pass
        else:
            console.print("[red]--older-than format: e.g., 30d[/red]")
            raise typer.Exit(code=1)
    else:
        console.print("[yellow]Specify --older-than or --keep.[/yellow]")
        raise typer.Exit(code=1)

    for run_dir in to_remove:
        console.print(f"Removing {run_dir} ...")
        shutil.rmtree(run_dir, ignore_errors=True)

    console.print(f"[green]Removed {len(to_remove)} run(s).[/green]")


if __name__ == "__main__":
    app()
