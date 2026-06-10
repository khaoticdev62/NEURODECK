# NEURODECK PromptDrive v1.0 — PRD + SDS Master Blueprint

## Executive Summary
PromptDrive is a Steam Deck-native controller coding/programming/prompting system. It converts controller actions into structured development intent, letting users generate elite prompts, write code, refactor, test, document, automate, and orchestrate agents without keyboard-first workflows.

## Product Goals

- Create the world's first fully controller-driven AI coding and prompt engineering environment.
- Make every critical action reachable from Steam Deck controls, including L4/L5/R4/R5.
- Provide a huge structured prompt library with autocomplete and validation.
- Support local-first/offline-first operation with optional remote providers.
- Build a production-ready Electron + React + TypeScript + Tailwind application.

## Product Pillars

1. **Controller First** — everything reachable without keyboard or touchscreen.
2. **Prompt Native** — prompts are structured objects, not text blobs.
3. **Intent Driven** — users choose outcomes; the system creates structure.
4. **Agent Assisted** — specialist agents route and validate work.
5. **Offline Capable** — core functionality works without network.

## Functional Requirements

### FR-001 Prompt Creation
Users can create prompts entirely via controller from reusable blocks.

### FR-002 Prompt Templates
System supports reusable, importable, exportable, versioned prompt templates.

### FR-003 Prompt Packs
Prompt packs cover Coding, Debugging, Testing, Security, UX, Architecture, Documentation, Git, Electron, React, Tailwind, and Steam Deck workflows.

### FR-004 Prompt Slots
Templates support typed slots such as text, select, file, multi-select, and boolean.

### FR-005 Autocomplete
Autocomplete supports prompts, commands, files, macros, agents, frameworks, languages, and recent workflows.

### FR-006 Macro System
Users can record controller workflows and replay them deterministically.

### FR-007 Agent System
Built-in agents include Architect, Developer, Refactor, Testing, Security, UX, Documentation, Release, Steam Deck QA, and Research.

### FR-008 Command Runtime
Commands include create file, open file, explain code, fix error, refactor, generate tests, run tests, audit security, audit UI, generate docs, and create commit message.

### FR-009 Controller Mapping
Every action supports controller mapping, keyboard fallback, and accessibility alternative.

## Nonfunctional Requirements

- 60 FPS target.
- Input latency under 16ms.
- Autocomplete under 50ms.
- Memory baseline under 350MB.
- WCAG AAA target.
- Secure Electron configuration.
- Local-first telemetry and memory.

## System Architecture

```text
Controller Runtime
  ↓
Input Dispatcher
  ↓
Focus Manager
  ↓
Prompt Composer / Command Runtime / Agent Runtime
  ↓
Model Provider
  ↓
Result Pipeline
```

## Electron Security Model

- Main process owns filesystem, database, command execution, plugins, and secrets.
- Renderer owns UI only.
- Preload exposes versioned, validated APIs.
- Renderer never talks directly to storage or OS APIs.

## Definition of Done

PromptDrive v1.0 is complete when a user can open NEURODECK on Steam Deck, navigate entirely by controller, select a coding intent, build a structured prompt, autocomplete major slots, execute through an agent, save the workflow as a macro, and recover safely from mistakes.
