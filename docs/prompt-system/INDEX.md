# Production Code Prompt System

A complete professional prompt chain for auditing, refining, testing, hardening, documenting, and certifying production-quality software projects with AI coding tools.

This pack is designed for repo-aware AI coding assistants such as Cursor, Claude Code, Kimi, Codex-style tools, Gemini CLI, Windsurf, and similar systems.

> No fake commands. No fake APIs. No fake files. No placeholder logic. Production code only.

---

## Prompt Inventory

| # | Prompt | Use It For |
|---:|---|---|
| 01 | Codebase Audit + Refinement | Broad repo audit, quality review, production-readiness discovery |
| 02 | Bug-Fix + Implementation | Fix confirmed bugs, crashes, failing tests, runtime errors |
| 03 | Security Hardening + OWASP | Secrets, auth, input validation, OWASP risks, frontend exposure |
| 04 | Testing Expansion + Regression Coverage | Unit, integration, E2E, regression, edge-case coverage |
| 05 | Performance + Efficiency Optimization | Speed, memory, bundle size, query efficiency, hot paths |
| 06 | Deep Codebase Refactor | God files, duplication, type safety, maintainability, cleanup |
| 07 | Architecture Recovery + Modularization | Broken structure, module boundaries, dependency direction |
| 08 | Dependency Hygiene + Build System Optimization | Package cleanup, lockfiles, scripts, build reliability |
| 09 | CI/CD + Release Engineering | GitHub Actions, build gates, artifacts, releases, rollback |
| 10 | Documentation + Developer Handoff | README, setup, architecture docs, troubleshooting, handoff |
| 11 | UX/UI + Accessibility Code Quality | Components, layout, accessibility, keyboard/controller navigation |
| 12 | Observability + Runtime Reliability | Logging, errors, retries, timeouts, health checks, incident readiness |
| 13 | Data Layer + API Contract Quality | APIs, schemas, DTOs, database access, migrations, contracts |
| 14 | AI Agent Orchestration + Repo Task Execution | Master controller for selecting and sequencing specialist prompts |
| 15 | Final Production Readiness + Release Certification | Final go/no-go release gate |

---

## Recommended Full Execution Order

```txt
01 Codebase Audit + Refinement
08 Dependency Hygiene + Build System Optimization
02 Bug-Fix + Implementation
03 Security Hardening + OWASP
13 Data Layer + API Contract Quality
04 Testing Expansion + Regression Coverage
06 Deep Codebase Refactor
07 Architecture Recovery + Modularization
05 Performance + Efficiency Optimization
12 Observability + Runtime Reliability
11 UX/UI + Accessibility Code Quality
09 CI/CD + Release Engineering
10 Documentation + Developer Handoff
15 Final Production Readiness + Release Certification
```

---

## Which Prompt To Use When

### Unknown repo or unclear task
Use `prompts/14_ai_agent_orchestration.md`.

### Full audit
Use `prompts/01_codebase_audit_refinement.md`.

### Bug, crash, or failing test
Use `prompts/02_bugfix_implementation.md`.

### Security concerns
Use `prompts/03_security_hardening_owasp.md`.

### Preparing to ship
Use `prompts/15_final_release_certification.md`.

---

## Fast Workflows

### Full Production Readiness

```txt
14 AI Agent Orchestration
01 Codebase Audit
03 Security Hardening
13 Data/API Contracts
04 Testing Expansion
12 Observability/Reliability
09 CI/CD
10 Documentation
15 Final Release Certification
```

### Bug Fix

```txt
14 AI Agent Orchestration
02 Bug-Fix + Implementation
04 Testing Expansion
12 Observability/Reliability if runtime failure was involved
10 Documentation if behavior changed
```

### Refactor

```txt
01 Codebase Audit
04 Testing Expansion
06 Deep Codebase Refactor
07 Architecture Recovery if boundaries are broken
15 Release Certification before shipping
```

### Build/Install Repair

```txt
08 Dependency Hygiene + Build System Optimization
09 CI/CD + Release Engineering
10 Documentation + Developer Handoff
15 Release Certification
```

---

## How To Use

Paste one specialist prompt into your AI coding tool, then provide repository context.

Recommended first instruction:

```md
Begin with discovery only. Detect the stack, verify real commands, map the project, identify risks, and do not modify files yet.
```

After discovery:

```md
Proceed with the smallest safe change first. Preserve behavior, add/update tests, provide rollback, and verify with real commands only.
```

For large projects, start with:

```md
Use the AI Agent Orchestration prompt first. Select the correct specialist module based on the repository and my current task. Do not edit files until the module plan is complete.
```

---

## Core Standards Across The Pack

- Real commands only
- Real imports only
- Real APIs only
- Real package managers only
- Real framework behavior only
- No placeholder production code
- No fake tests
- No fake docs
- No fake CI/CD
- No unsafe dependency changes
- No unplanned public contract changes
- No database changes without migration and rollback
- No secret leakage
- Concrete file-level fixes
- Verification steps
- Rollback steps

---

## Release Certification Rule

Before shipping anything to real users, run:

```txt
prompts/15_final_release_certification.md
```

The final output should be one of:

```txt
APPROVED
APPROVED WITH WARNINGS
BLOCKED
BLOCKED UNTIL FIXES COMPLETE
```
