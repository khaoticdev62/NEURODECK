import type { AcademyPortfolioEntry } from "../../../services/bridgeAdapter";

type Entry = AcademyPortfolioEntry;

// ── Markdown ──────────────────────────────────────────────────────────────────

export function entryToMarkdown(entry: Entry): string {
  const lines: string[] = [];
  lines.push(`## ${entry.labTitle}`);
  lines.push(`**Date:** ${new Date(entry.timestamp).toLocaleDateString()}`);
  if (entry.summary) lines.push(`\n**Summary:** ${entry.summary}`);

  if (entry.findings.length > 0) {
    lines.push("\n**Findings:**");
    entry.findings.forEach((f) => lines.push(`- ${f}`));
  }
  if (entry.commandsUsed.length > 0) {
    lines.push("\n**Commands / Queries Used:**");
    lines.push("```");
    entry.commandsUsed.forEach((c) => lines.push(c));
    lines.push("```");
  }
  if (entry.mitreMappings.length > 0) {
    lines.push(`\n**MITRE ATT&CK:** ${entry.mitreMappings.join(", ")}`);
  }
  if (entry.skillsEarned.length > 0) {
    lines.push(`\n**Skills Demonstrated:** ${entry.skillsEarned.join(", ")}`);
  }
  return lines.join("\n");
}

export function entriesToMarkdown(entries: Entry[]): string {
  const header = [
    "# NeuroDeck Ops Academy — SOC Portfolio",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "---",
    "",
  ].join("\n");
  return header + entries.map(entryToMarkdown).join("\n\n---\n\n");
}

// ── Resume bullet (STAR-adjacent) ─────────────────────────────────────────────

export function entryToResumeBullet(entry: Entry): string {
  const isSoc = entry.labId.startsWith("soc-session");
  const skills = entry.skillsEarned.join(", ") || "security analysis";

  if (isSoc) {
    const tpCount = entry.findings.filter((f) => f.includes("true-positive")).length;
    const fpCount = entry.findings.filter((f) => f.includes("false-positive")).length;
    const techniques = entry.mitreMappings.slice(0, 3).join(", ");
    const techSuffix = techniques ? `; mapped threats to ${techniques}` : "";
    return `• Triaged ${entry.findings.length} security alerts — correctly identified ${tpCount} true positives and ${fpCount} false positives${techSuffix}, demonstrating ${skills} proficiency`;
  }

  const cmdCount = entry.commandsUsed.length;
  const findingCount = entry.findings.length;
  const techniques = entry.mitreMappings.slice(0, 2).join(", ");
  const parts: string[] = [`• Completed ${entry.labTitle} investigation`];
  if (findingCount > 0)
    parts.push(`identifying ${findingCount} key finding${findingCount > 1 ? "s" : ""}`);
  if (cmdCount > 0) parts.push(`using ${cmdCount} analytical technique${cmdCount > 1 ? "s" : ""}`);
  if (techniques) parts.push(`correlated with MITRE ATT&CK ${techniques}`);
  parts.push(`demonstrating ${skills}`);
  return parts.join(", ") + ".";
}

export function entriesToResumeBullets(entries: Entry[]): string {
  return entries.map(entryToResumeBullet).join("\n");
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface PortfolioStats {
  totalEntries: number;
  uniqueMitre: string[];
  uniqueSkills: string[];
  totalFindings: number;
}

export function computeStats(entries: Entry[]): PortfolioStats {
  const mitre = new Set<string>();
  const skills = new Set<string>();
  let findings = 0;
  for (const e of entries) {
    e.mitreMappings.forEach((m) => mitre.add(m));
    e.skillsEarned.forEach((s) => skills.add(s));
    findings += e.findings.length;
  }
  return {
    totalEntries: entries.length,
    uniqueMitre: [...mitre],
    uniqueSkills: [...skills],
    totalFindings: findings,
  };
}

// ── Download helpers ──────────────────────────────────────────────────────────

export function downloadText(content: string, filename: string, mime = "text/markdown") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
