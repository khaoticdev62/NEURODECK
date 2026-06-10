# Volume II — Steam Deck UX Bible: Screen Specifications

## Universal Screen Acceptance Criteria

Every screen must be controller accessible, show visible focus state, avoid dead-end navigation, keep B as back, keep A as confirm, maintain 60 FPS on Steam Deck, optimize for 1280×800, support suspend/resume, and support accessibility modes.

## Screen 01 — Workspace

Primary operating environment.

```text
Status Bar
Workspace Viewport
Memory / Context Panel | Agent Status / Active Tasks
Prompt Composer
```

Controls: left stick/D-pad move focus, right stick scroll, L1/R1 switch panels, A activate, B back, L4 prompt library, R5 command palette.

## Screen 02 — Prompt Composer

Build prompts without typing.

Sections: template, slots, preview, validation, execute.

Controller flow: L4 → select template → fill slots → preview → R5 hold execute.

## Screen 03 — Prompt Library

Sections: favorites, recent, coding, refactor, testing, security, UX, Steam Deck, Git, architecture.

Must load under 100ms and support controller navigation.

## Screen 04 — Command Palette

Opened by R5. Universal launcher for commands, macros, agents, and recent actions. Search response under 50ms.

## Screen 05 — Agent Console

Manage active AI specialists. L4 hold opens Agent Wheel. Agent switch under two actions.

## Screen 06 — Macro Recorder

L5 + R5 starts/stops recording. States: idle, recording, paused, saving, executing.

## Screen 07 — Controller Mapper

Supports Steam Deck, Xbox, DualSense, keyboard. All actions remappable. Profiles importable/exportable.

## Screen 08 — Session Browser

Recent, pinned, projects, archived. Actions: open, rename, duplicate, delete, pin.

## Screen 09 — Diagnostics

Metrics: FPS, memory, CPU, autocomplete latency, prompt execution time, controller latency, macro success rate.

## Screen 10 — Accessibility

Modes: high contrast, low vision, reduced motion, colorblind, dyslexia friendly, large text.

## Screen 11 — Settings

General, controllers, models, agents, prompts, accessibility, appearance, plugins, telemetry.

## Screen 12 — Telemetry Dashboard

Local-only metrics by default: prompt count, agent usage, macro usage, latency, memory, session duration.
