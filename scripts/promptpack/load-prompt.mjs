#!/usr/bin/env node
// Lightweight coding-agent entry point for the Production Code Prompt System
// (Epic 14, Story 14.3). Prints the full content of a specialist prompt by
// number or short name so it can be loaded straight into the active Claude
// Code (or any other coding-agent) session — no Python install required.
//
// For full automated audit runs (sequencing, state tracking, resumability,
// report generation, real LLM-provider dispatch), use the real PromptFlow
// CLI at docs/prompt-system/ instead (`python -m promptflow run ...` — see
// docs/prompt-system/README.md). This script is the zero-dependency
// "just show me prompt N right now" shortcut, not a replacement for it.
//
// Usage:
//   node scripts/promptpack/load-prompt.mjs            -> default entry (14, orchestration)
//   node scripts/promptpack/load-prompt.mjs release     -> alias for 15 (release certification)
//   node scripts/promptpack/load-prompt.mjs 03          -> by stage number
//   node scripts/promptpack/load-prompt.mjs security    -> by short name

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const promptsDir = join(repoRoot, "docs", "prompt-system", "prompts");
const quickstartPath = join(repoRoot, "docs", "prompt-system", "QUICKSTART.md");

// Short-name aliases, derived from INDEX.md's prompt inventory table.
const ALIASES = {
  audit: "01",
  bugfix: "02",
  "bug-fix": "02",
  security: "03",
  testing: "04",
  performance: "05",
  refactor: "06",
  architecture: "07",
  dependencies: "08",
  deps: "08",
  cicd: "09",
  "ci-cd": "09",
  docs: "10",
  documentation: "10",
  accessibility: "11",
  "ux-ui": "11",
  observability: "12",
  reliability: "12",
  data: "13",
  api: "13",
  orchestration: "14",
  default: "14",
  start: "14",
  release: "15",
  certification: "15",
};

function listPrompts() {
  return readdirSync(promptsDir)
    .filter((f) => /^\d{2}_.*\.md$/.test(f))
    .sort();
}

function resolveStage(arg) {
  const files = listPrompts();
  if (!arg) return files.find((f) => f.startsWith("14_"));

  const normalized = arg.trim().toLowerCase();
  const stageNumber = /^\d{1,2}$/.test(normalized)
    ? normalized.padStart(2, "0")
    : ALIASES[normalized];

  if (!stageNumber) return null;
  return files.find((f) => f.startsWith(`${stageNumber}_`)) ?? null;
}

function printUsageError(arg) {
  const files = listPrompts();
  console.error(`No specialist prompt matches '${arg}'.\n`);
  console.error("Valid stage numbers and files:");
  for (const f of files) console.error(`  ${f.slice(0, 2)}  ${f}`);
  console.error("\nValid short-name aliases:");
  console.error(`  ${Object.keys(ALIASES).join(", ")}`);
  process.exitCode = 1;
}

const arg = process.argv[2];
const filename = resolveStage(arg);

if (!filename) {
  printUsageError(arg ?? "(none)");
} else {
  const content = readFileSync(join(promptsDir, filename), "utf8");
  console.log(content);

  const isDefaultEntry = !arg || ["default", "start"].includes(arg.trim().toLowerCase());
  const isReleaseEntry = arg && ["release", "certification", "15"].includes(arg.trim().toLowerCase());

  if (isDefaultEntry || isReleaseEntry) {
    console.log("\n---\n");
    console.log("## Suggested Usage (from QUICKSTART.md)\n");
    const quickstart = readFileSync(quickstartPath, "utf8");
    console.log(quickstart);
  }
}
