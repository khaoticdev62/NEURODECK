# Phase XVI — Production Implementation Suite

## Master Epic Backlog

### Epic 001 — Controller Runtime P0
Focus graph engine, input dispatcher, action registry, chord detection, Steam Input integration, controller mapper, suspend/resume input recovery.

### Epic 002 — Prompt Composer P0
Prompt templates, slot system, autocomplete engine, prompt preview, prompt validation, prompt execution.

### Epic 003 — Agent Runtime P0
Agent registry, router, chaining, escalation engine, memory, validation.

### Epic 004 — Memory Engine P0
Session memory, workspace memory, project memory, global memory, snapshots, compression.

### Epic 005 — Plugin SDK P1
Hermes runtime, plugin loader, permission engine, sandbox runtime, marketplace.

## Database Schema
Tables: projects, prompts, agents, macros, memory_entries, plugins, controller_profiles, sessions, telemetry_events.

## Repository Structure

```text
neurodeck/
  apps/desktop/
  packages/controller-runtime/
  packages/prompt-engine/
  packages/memory-engine/
  packages/agent-runtime/
  packages/plugin-sdk/
  packages/design-system/
  packages/telemetry/
  packages/security/
  packages/shared/
  prompt-packs/
  plugins/
  scripts/
  .github/
```

## Sprint Plan
Sprint 1: Electron shell, design system, controller runtime, database setup.
Sprint 2: prompt templates, slot engine, autocomplete, prompt execution.
Sprint 3: agent registry, routing, memory integration.
Sprint 4: snapshots, compression, context injection.
Sprint 5: focus graphs, L4/L5/R4/R5, suspend/resume.
Sprint 6: Hermes runtime, plugin loader, sandbox.

## Definition of Production Ready
All P0 epics complete, Steam Deck certification passes, accessibility certification passes, security certification passes, QA certification passes, release pipeline passes, documentation complete, controller-only workflows validated.
