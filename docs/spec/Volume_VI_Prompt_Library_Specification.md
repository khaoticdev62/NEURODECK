# Volume VI — Prompt Library Specification

## Philosophy
PromptDrive prompts are structured objects containing role, task, context, constraints, output, and validation. Prompt packs power autocomplete, agents, macros, and workflow automation.

## Prompt Pack Structure

```text
prompt-pack/
  manifest.json
  templates/
  macros/
  assets/
  icon.png
```

## Template Schema

```json
{
  "id": "refactor.production.safe",
  "title": "Production Safe Refactor",
  "category": "refactor",
  "role": "Senior Software Engineer",
  "task": "Refactor existing code",
  "context": "",
  "constraints": "",
  "output": "",
  "validation": [],
  "slots": []
}
```

## Slot Types
Text, select, file, multi-select, boolean.

## Core Prompt Packs
Coding, Refactor, Testing, Security, Architecture, UX, Documentation, Steam Deck, Git, Release, Electron, React, TypeScript, Tailwind, Lua, Plugin Development.

## Agent Compatibility
Every prompt can specify compatible agents and routing preferences.

## Ranking Formula
35% prefix, 25% context, 15% agent, 15% recent, 10% pinned.

## Library Growth Strategy
Phase 1: 100 templates. Phase 2: 250. Phase 3: 500. Phase 4: 1000+.

## Acceptance Criteria
500+ templates, all validated, agent compatibility defined, autocomplete optimized, import/export functional, macros supported, controller navigation complete.
