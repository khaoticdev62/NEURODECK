"""Safety systems for patch handling and command execution."""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Any

from rich.console import Console

from promptflow.errors import SafetyError

console = Console()

RISKY_COMMANDS = [
    "rm -rf",
    "del /s",
    "format",
    "drop database",
    "delete from",
    "git reset --hard",
    "git clean -fdx",
    "docker system prune",
    "npm publish",
    "twine upload",
    "cargo publish",
]


def check_git_status(repo_path: Path | str) -> dict[str, Any]:
    """Check if the git working tree is dirty."""
    repo = Path(repo_path)
    result = {"is_git": False, "dirty": False, "branch": "", "files": []}
    if not (repo / ".git").exists():
        return result
    result["is_git"] = True
    try:
        branch = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=repo,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if branch.returncode == 0:
            result["branch"] = branch.stdout.strip()

        status = subprocess.run(
            ["git", "status", "--short"],
            cwd=repo,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if status.returncode == 0:
            lines = [line for line in status.stdout.strip().splitlines() if line.strip()]
            result["files"] = lines
            result["dirty"] = bool(lines)
    except Exception:
        pass
    return result


def require_clean_git_or_confirm(repo_path: Path | str) -> bool:
    """Warn if git working tree is dirty and require confirmation."""
    status = check_git_status(repo_path)
    if not status["is_git"]:
        console.print("[yellow]Not a git repository.[/yellow]")
        return True
    if status["dirty"]:
        console.print(
            f"[yellow]Warning: Git working tree is dirty on branch '{status['branch']}'.[/yellow]"
        )
        console.print("Uncommitted changes:")
        for f in status["files"]:
            console.print(f"  {f}")
        console.print()
        return False
    return True


def create_checkpoint_branch(repo_path: Path | str, run_id: str) -> None:
    """Create a git checkpoint branch before applying patches."""
    repo = Path(repo_path)
    if not (repo / ".git").exists():
        return
    branch_name = f"promptflow/{run_id}"
    try:
        subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=repo,
            check=True,
            capture_output=True,
            timeout=10,
        )
        console.print(f"[green]Created checkpoint branch: {branch_name}[/green]")
    except subprocess.CalledProcessError as exc:
        console.print(f"[yellow]Could not create checkpoint branch: {exc}[/yellow]")


def backup_file(file_path: Path) -> Path:
    """Create a .bak backup of a file."""
    backup = file_path.with_suffix(file_path.suffix + ".bak")
    counter = 1
    while backup.exists():
        backup = file_path.with_suffix(file_path.suffix + f".bak{counter}")
        counter += 1
    shutil.copy2(file_path, backup)
    return backup


def is_risky_command(command: str) -> bool:
    """Check if a command is in the risky list."""
    lowered = command.lower()
    return any(risky.lower() in lowered for risky in RISKY_COMMANDS)


def confirm_apply_patches(files: list[str]) -> bool:
    """Show files to change and ask for confirmation."""
    console.print("[bold]The following files will be modified:[/bold]")
    for f in files:
        console.print(f"  - {f}")
    console.print()
    response = console.input("Apply patches? [y/N]: ")
    return response.lower().strip() in {"y", "yes"}


def apply_patch_mode_check(
    repo_path: Path | str,
    mode: str,
    run_id: str,
    yes: bool = False,
) -> bool:
    """Return True if it's safe to proceed with patch application."""
    if mode == "report-only":
        console.print("[dim]Report-only mode: no files will be modified.[/dim]")
        return False
    if mode == "patch-review":
        console.print("[dim]Patch-review mode: patches extracted but not applied.[/dim]")
        return False
    if mode != "apply-patch":
        raise SafetyError(f"Unknown patch mode: {mode}")

    if not require_clean_git_or_confirm(repo_path):
        if yes:
            console.print("[yellow]Proceeding despite dirty working tree (--yes).[/yellow]")
        else:
            raise SafetyError(
                "Git working tree is dirty. Commit changes or pass --yes to proceed.",
                details="Use --yes to override, or commit/stash your changes first.",
            )

    if not yes:
        console.print("Patches will be applied to the target repository.")
        response = console.input("Continue? [y/N]: ")
        if response.lower().strip() not in {"y", "yes"}:
            return False

    create_checkpoint_branch(repo_path, run_id)
    return True
