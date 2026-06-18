"""Safe command runner with allowlist and confirmation gates."""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

from rich.console import Console

from promptflow.errors import CommandExecutionError, SafetyError
from promptflow.safety import is_risky_command

console = Console()

# Allowlist of safe verification commands (prefix matching)
ALLOWLIST = [
    "python",
    "python3",
    "pytest",
    "npm",
    "yarn",
    "pnpm",
    "cargo",
    "go",
    "make",
    "cmake",
    "docker",
    "docker-compose",
    "git",
    "rustc",
    "java",
    "javac",
    "gradle",
    "mvn",
    "tox",
    "ruff",
    "mypy",
    "black",
    "prettier",
    "eslint",
]


def run_command(
    cmd: list[str],
    *,
    cwd: Path | str | None = None,
    timeout: int = 300,
    require_confirmation: bool = True,
    shell: bool = False,
) -> dict[str, Any]:
    """Run a command safely with confirmation and timeout."""
    if not cmd:
        raise CommandExecutionError("Empty command.")

    if shell:
        raise SafetyError("shell=True is not allowed for arbitrary commands.")

    command_str = " ".join(cmd)
    executable = cmd[0]

    # Check allowlist
    if executable not in ALLOWLIST:
        raise SafetyError(
            f"Command '{executable}' is not in the allowlist.",
            details=f"Allowed: {', '.join(ALLOWLIST)}",
        )

    # Check risky substrings
    if is_risky_command(command_str):
        raise SafetyError(
            f"Command '{command_str}' matches a risky pattern.",
            details="This command requires manual execution.",
        )

    if require_confirmation:
        console.print(f"[bold]Command to run:[/bold] {command_str}")
        response = console.input("Execute? [y/N]: ")
        if response.lower().strip() not in {"y", "yes"}:
            return {"executed": False, "stdout": "", "stderr": "", "returncode": -1}

    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "executed": True,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired as exc:
        raise CommandExecutionError(f"Command timed out after {timeout}s: {command_str}") from exc
    except Exception as exc:
        raise CommandExecutionError(f"Command failed: {exc}") from exc
