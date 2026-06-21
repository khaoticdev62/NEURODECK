#!/usr/bin/env node
// Generates assets/prompt-packs/production-code-prompt-system.json from the
// 15 specialist prompts in docs/prompt-system/prompts/ — the canonical home
// of the PromptFlow CLI tool and its prompt pack (see docs/prompt-system/README.md
// and docs/PRODUCTION_PROMPT_PACK_HANDOFF.md). Re-run after any update to
// those source markdown files to keep the in-app Prompt Lab pack in sync
// (Story 14.4 / Epic 14).

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const promptsDir = join(repoRoot, "docs", "prompt-system", "prompts");
const outPath = join(repoRoot, "assets", "prompt-packs", "production-code-prompt-system.json");

const PACK_ID = "production-code-prompt-system";

// Slug, title, category, and description per INDEX.md's prompt inventory.
const META = {
  "01_codebase_audit_refinement.md": {
    slug: "codebase_audit_refinement",
    title: "Codebase Audit + Refinement",
    category: "Audit",
    description: "Broad repo audit, quality review, production-readiness discovery.",
  },
  "02_bugfix_implementation.md": {
    slug: "bugfix_implementation",
    title: "Bug-Fix + Implementation",
    category: "Bug Fix",
    description: "Fix confirmed bugs, crashes, failing tests, runtime errors.",
  },
  "03_security_hardening_owasp.md": {
    slug: "security_hardening_owasp",
    title: "Security Hardening + OWASP",
    category: "Security",
    description: "Secrets, auth, input validation, OWASP risks, frontend exposure.",
  },
  "04_testing_regression_coverage.md": {
    slug: "testing_regression_coverage",
    title: "Testing Expansion + Regression Coverage",
    category: "Testing",
    description: "Unit, integration, E2E, regression, edge-case coverage.",
  },
  "05_performance_efficiency.md": {
    slug: "performance_efficiency",
    title: "Performance + Efficiency Optimization",
    category: "Performance",
    description: "Speed, memory, bundle size, query efficiency, hot paths.",
  },
  "06_deep_codebase_refactor.md": {
    slug: "deep_codebase_refactor",
    title: "Deep Codebase Refactor",
    category: "Refactor",
    description: "God files, duplication, type safety, maintainability, cleanup.",
  },
  "07_architecture_recovery_modularization.md": {
    slug: "architecture_recovery_modularization",
    title: "Architecture Recovery + Modularization",
    category: "Architecture",
    description: "Broken structure, module boundaries, dependency direction.",
  },
  "08_dependency_hygiene_build_system.md": {
    slug: "dependency_hygiene_build_system",
    title: "Dependency Hygiene + Build System Optimization",
    category: "Dependencies",
    description: "Package cleanup, lockfiles, scripts, build reliability.",
  },
  "09_cicd_release_engineering.md": {
    slug: "cicd_release_engineering",
    title: "CI/CD + Release Engineering",
    category: "CI/CD",
    description: "GitHub Actions, build gates, artifacts, releases, rollback.",
  },
  "10_documentation_developer_handoff.md": {
    slug: "documentation_developer_handoff",
    title: "Documentation + Developer Handoff",
    category: "Documentation",
    description: "README, setup, architecture docs, troubleshooting, handoff.",
  },
  "11_ux_ui_accessibility.md": {
    slug: "ux_ui_accessibility",
    title: "UX/UI + Accessibility Code Quality",
    category: "Accessibility",
    description: "Components, layout, accessibility, keyboard/controller navigation.",
  },
  "12_observability_runtime_reliability.md": {
    slug: "observability_runtime_reliability",
    title: "Observability + Runtime Reliability",
    category: "Observability",
    description: "Logging, errors, retries, timeouts, health checks, incident readiness.",
  },
  "13_data_layer_api_contracts.md": {
    slug: "data_layer_api_contracts",
    title: "Data Layer + API Contract Quality",
    category: "Data/API",
    description: "APIs, schemas, DTOs, database access, migrations, contracts.",
  },
  "14_ai_agent_orchestration.md": {
    slug: "ai_agent_orchestration",
    title: "AI Agent Orchestration + Repo Task Execution",
    category: "Orchestration",
    description: "Master controller for selecting and sequencing specialist prompts.",
  },
  "15_final_release_certification.md": {
    slug: "final_release_certification",
    title: "Final Production Readiness + Release Certification",
    category: "Release",
    description: "Final go/no-go release gate.",
  },
};

const files = readdirSync(promptsDir)
  .filter((f) => /^\d{2}_.*\.md$/.test(f))
  .sort();

if (files.length !== Object.keys(META).length) {
  console.error(
    `Expected ${Object.keys(META).length} prompt files, found ${files.length}: ${files.join(", ")}`
  );
  process.exit(1);
}

const templates = files.map((filename) => {
  const meta = META[filename];
  if (!meta) {
    throw new Error(`No metadata mapping for ${filename} — update META in this script.`);
  }
  const stageNumber = filename.slice(0, 2);
  const content = readFileSync(join(promptsDir, filename), "utf8").trimEnd();

  // Full source content preserved verbatim — no truncation, no summarization.
  // A single optional slot lets the user append project-specific context
  // without editing the specialist prompt's own text.
  const template =
    `${content}\n\n---\n\n` +
    `## Project-Specific Context (optional)\n\n{{task_context}}\n`;

  return {
    id: `${PACK_ID}.${meta.slug}`,
    pack_id: PACK_ID,
    title: `${stageNumber} — ${meta.title}`,
    description: meta.description,
    category: meta.category,
    agent_hint: "developer",
    slots: [
      {
        id: "task_context",
        label: "Project-Specific Context (optional)",
        required: false,
        kind: "text",
        default: "",
        options: [],
        suggestions: [],
      },
    ],
    template,
    risk_level: "low",
    intent: "production_audit_methodology",
    role: "Senior Principal Engineer",
    autocomplete_terms: [meta.category.toLowerCase(), "production", "audit", stageNumber],
    requires_confirmation: false,
  };
});

const pack = {
  packs: [
    {
      id: PACK_ID,
      title: "Production Code Prompt System — Specialist Audits",
      description:
        "15 full specialist methodology prompts (audit, security, testing, performance, " +
        "refactor, architecture, dependencies, CI/CD, docs, accessibility, observability, " +
        "data/API, orchestration, release certification) recovered from " +
        "production_code_prompt_system/prompts/. These are large, mostly-fixed mega-prompts " +
        "meant to load an entire methodology into context — unlike the smaller slot-driven " +
        "templates in the coding.production pack.",
      templates,
    },
  ],
};

writeFileSync(outPath, JSON.stringify(pack, null, 2) + "\n", "utf8");
console.log(`Wrote ${templates.length} templates to ${outPath}`);
