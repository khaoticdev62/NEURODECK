"""Report generation from run outputs."""

from __future__ import annotations

from pathlib import Path

from promptflow.models import RunState


class ReportGenerator:
    """Generate consolidated reports from a workflow run."""

    def __init__(self, run_dir: Path, state: RunState) -> None:
        self.run_dir = run_dir
        self.state = state

    def generate_all(self) -> dict[str, Path]:
        """Generate all report files and return their paths."""
        reports_dir = self.run_dir / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        paths: dict[str, Path] = {}

        paths["summary"] = self._generate_summary(reports_dir)
        paths["full_report"] = self._generate_full_report(reports_dir)
        paths["blockers"] = self._generate_blockers(reports_dir)
        paths["warnings"] = self._generate_warnings(reports_dir)
        paths["next_actions"] = self._generate_next_actions(reports_dir)
        paths["release_decision"] = self._generate_release_decision(reports_dir)
        return paths

    def _generate_summary(self, reports_dir: Path) -> Path:
        path = reports_dir / "summary.md"
        lines = [
            "# Run Summary",
            "",
            f"- **Run ID:** {self.state.run_id}",
            f"- **Target repo:** {self.state.target_repo}",
            f"- **Sequence:** {self.state.sequence}",
            f"- **Provider:** {self.state.provider}",
            f"- **Model:** {self.state.model or 'N/A'}",
            f"- **Started:** {self.state.started_at}",
            f"- **Status:** {self.state.status}",
            f"- **Completed stages:** {', '.join(self.state.completed_stages) or 'None'}",
            f"- **Failed stages:** {', '.join(self.state.failed_stages) or 'None'}",
            "",
        ]
        if self.state.blockers:
            lines.extend(["## Blockers", ""])
            for b in self.state.blockers:
                lines.append(f"- {b}")
            lines.append("")
        if self.state.warnings:
            lines.extend(["## Warnings", ""])
            for w in self.state.warnings:
                lines.append(f"- {w}")
            lines.append("")
        lines.extend(
            ["## Next Actions", "", "1. Review stage outputs in the responses/ directory.", ""]
        )
        path.write_text("\n".join(lines), encoding="utf-8")
        return path

    def _generate_full_report(self, reports_dir: Path) -> Path:
        path = reports_dir / "full_report.md"
        lines = ["# Full Report", f"**Run ID:** {self.state.run_id}", ""]
        for stage_id in self.state.completed_stages:
            resp_path = self.run_dir / "responses" / f"{stage_id}_response.md"
            if resp_path.exists():
                lines.extend(
                    [f"## Stage {stage_id}", "", resp_path.read_text(encoding="utf-8"), ""]
                )
        path.write_text("\n".join(lines), encoding="utf-8")
        return path

    def _generate_blockers(self, reports_dir: Path) -> Path:
        path = reports_dir / "blockers.md"
        lines = ["# Blockers", ""]
        if self.state.blockers:
            for b in self.state.blockers:
                lines.append(f"- {b}")
        else:
            lines.append("No blockers detected.")
        lines.append("")
        path.write_text("\n".join(lines), encoding="utf-8")
        return path

    def _generate_warnings(self, reports_dir: Path) -> Path:
        path = reports_dir / "warnings.md"
        lines = ["# Warnings", ""]
        if self.state.warnings:
            for w in self.state.warnings:
                lines.append(f"- {w}")
        else:
            lines.append("No warnings recorded.")
        lines.append("")
        path.write_text("\n".join(lines), encoding="utf-8")
        return path

    def _generate_next_actions(self, reports_dir: Path) -> Path:
        path = reports_dir / "next_actions.md"
        lines = [
            "# Next Actions",
            "",
            "1. Review the full report for detailed recommendations.",
            "2. Address any blockers before proceeding.",
            "3. Run verification commands for changed stages.",
            "",
        ]
        path.write_text("\n".join(lines), encoding="utf-8")
        return path

    def _generate_release_decision(self, reports_dir: Path) -> Path:
        path = reports_dir / "release_decision.md"
        lines = ["# Release Decision", ""]
        if "15" in self.state.completed_stages:
            resp_path = self.run_dir / "responses" / "15_response.md"
            if resp_path.exists():
                content = resp_path.read_text(encoding="utf-8").upper()
                for decision in ["APPROVED", "BLOCKED", "BLOCKED UNTIL FIXES COMPLETE"]:
                    if decision in content:
                        lines.append(f"**Decision:** {decision}")
                        break
                else:
                    lines.append("**Decision:** APPROVED WITH WARNINGS")
            else:
                lines.append("**Decision:** Unknown — stage 15 response missing.")
        else:
            lines.append("**Decision:** N/A — stage 15 not completed.")
        lines.append("")
        path.write_text("\n".join(lines), encoding="utf-8")
        return path
