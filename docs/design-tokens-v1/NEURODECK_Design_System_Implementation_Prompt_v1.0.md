# NEURODECK Design Tokens + Component Library Implementation Prompt v1.0

You are a senior Electron, React, TypeScript, Tailwind, accessibility, and Steam Deck UX engineer.

Implement the NEURODECK Design Tokens + Component Library v1.0 exactly from the provided specification.

## Deliverables

1. CSS variable token files.
2. Tailwind config mapped to CSS variables.
3. Theme files: Blacksite, Tactical Glass, High Contrast, Reduced Motion, Colorblind Safe.
4. Component registry imported into the app docs.
5. React/TypeScript components:
   - Button
   - IconButton
   - Badge
   - TextInput
   - Select
   - AppShell
   - Panel
   - NavRail
   - TopStatusBar
   - ChatViewport
   - ResponseCard
   - InputConsole
   - CommandPalette
   - ModelCard
   - AgentCard
   - MemoryPanel
   - SessionCard
   - PluginCard
   - TelemetryWidget
   - DiagnosticsPanel
   - Modal
   - Toast
   - ConfirmDialog
6. Tests for each component.
7. Demo route or Storybook stories.
8. Accessibility notes per component.
9. Controller navigation notes per component.

## Rules

- Do not hardcode colors.
- Do not invent undocumented spacing.
- Do not bypass token files.
- Do not call Electron IPC directly from low-level components.
- Do not create hover-only critical actions.
- Do not ignore reduced-motion preferences.
- Do not create components without visible focus states.
- Do not use unsafe renderer APIs.

## Acceptance Criteria

- All components compile under strict TypeScript.
- All components render at 1280 × 800 without clipping.
- Critical components support keyboard and controller navigation.
- Accessibility checks pass.
- No token violations are present.
- No direct unsafe IPC access exists in UI primitives.
- Tests pass.
