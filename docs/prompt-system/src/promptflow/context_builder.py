"""Build repository context for AI prompts."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from promptflow.redaction import redact_text
from promptflow.repo_inspector import inspect_repo


def build_context(
    repo_path: Path | str,
    config: Any,
    previous_outputs: dict[str, str] | None = None,
) -> str:
    """Build a safe, redacted repository context string."""
    # config here is expected to have the context_* properties
    result = inspect_repo(
        repo_path,
        respect_gitignore=config.context_respect_gitignore,
        extra_excludes=config.context_exclude,
        max_files=config.context_max_context_files,
        max_file_bytes=config.context_max_file_bytes,
    )

    lines: list[str] = [
        "# Repository Context",
        "",
        f"**Path:** {result['repo_path']}",
        f"**Total files scanned:** {result['total_files_scanned']}",
        f"**Detected stacks:** {', '.join(result['detected_stacks']) or 'Unknown'}",
        f"**Suggested first prompt:** Stage {result['suggested_first_prompt']}",
        "",
        "## File Tree",
        "",
    ]
    for f in result["file_tree"]:
        lines.append(f"- {f}")

    if result["lockfiles"]:
        lines.extend(["", "## Lockfiles", ""])
        for f in result["lockfiles"]:
            lines.append(f"- {f}")

    if result["build_files"]:
        lines.extend(["", "## Build Files", ""])
        for f in result["build_files"]:
            lines.append(f"- {f}")

    if result["test_files"]:
        lines.extend(["", "## Test Files", ""])
        for f in result["test_files"]:
            lines.append(f"- {f}")

    if result["ci_files"]:
        lines.extend(["", "## CI/CD Files", ""])
        for f in result["ci_files"]:
            lines.append(f"- {f}")

    if result["docs"]:
        lines.extend(["", "## Documentation", ""])
        for f in result["docs"]:
            lines.append(f"- {f}")

    if result["high_risk_files"]:
        lines.extend(["", "## High-Risk Files (secrets/credentials)", ""])
        for f in result["high_risk_files"]:
            lines.append(f"- {f}")

    if result["git_branch"]:
        lines.extend(["", "## Git Status", ""])
        lines.append(f"**Branch:** {result['git_branch']}")
        if result["git_status"]:
            lines.append("**Uncommitted changes:**")
            for line in result["git_status"].splitlines():
                lines.append(f"  {line}")
        else:
            lines.append("Working tree clean.")

    if result["source_summaries"]:
        lines.extend(["", "## Source Summaries", ""])
        for summary in result["source_summaries"]:
            lines.append(f"### {summary['path']}")
            lines.append(f"- Size: {summary['size']} bytes")
            lines.append(f"- Lines: {summary['lines']}")
            if summary["preview"]:
                preview = summary["preview"].replace("\n", "\n  ")
                lines.append(f"- Preview:\n  ```\n  {preview}\n  ```")
            lines.append("")

    if previous_outputs:
        lines.extend(["", "## Previous Stage Outputs", ""])
        for stage_id, output in previous_outputs.items():
            lines.append(f"### {stage_id}")
            lines.append(output[:2000] if len(output) > 2000 else output)
            lines.append("")

    context = "\n".join(lines)

    if config.context_redact_secrets:
        context = redact_text(context)

    return context
