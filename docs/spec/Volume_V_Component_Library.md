# Volume V — Component Library Specification

## Universal Component Rules
Every component supports controller navigation, keyboard fallback, accessibility alternatives, visible focus, reduced motion, high contrast, large text, and theme switching.

## Components

### DeckButton
Primary interaction component with optional icon, label, controller hint, status indicator. States: default, hover, focus, active, disabled, loading, success, error.

### PromptBlockCard
Represents reusable prompt section. Includes title, description, role, slot count, risk badge, favorite indicator. A selects, X edits, Y details, B backs out.

### PromptSlotPicker
Fills prompt variables such as language, framework, constraints, output format. Up/down navigate, A selects, B backs, R4 accepts suggestion.

### PromptPreviewPanel
Renders final assembled prompt with sections for role, task, context, constraints, output, validation.

### SuggestionList
Autocomplete presentation. Shows suggestion, type, icon, confidence score. Updates under 50ms.

### CommandPalette
Universal launcher opened by R5. Sections: search, recent, favorites, commands, macros, agents.

### AgentCard
Represents AI specialist with name, role, capabilities, status.

### AgentWheel
Rapid agent switching activated by L4 hold.

### MacroTimeline
Visualizes macro steps and states: recording, paused, executing, completed, failed.

### Notification System
Types: info, success, warning, error, critical. Must not block focus.

### Modal Framework
Types: confirmation, input, warning, error. A confirms, B cancels. Focus trap required.

### SettingsRow
Standard settings entry with label, description, control, status.

### ControllerBindingRow
Action, current binding, edit button, reset button. A rebinds, X resets.

### TelemetryWidget
Shows FPS, memory, CPU, latency with normal, warning, critical states.

### DiagnosticsPanel
Performance, input, models, database, plugins.

### SessionCard
Stored sessions with name, date, agent, tags, pinned state.

### StatusBar
Always-visible model, agent, FPS, controller, project status.

### WorkspacePanel
Reusable content container with header, toolbar, content, footer.

### MemoryPanel
Session, project, agent memory sections.

### ControllerHintBar
Context-aware action hints, always accurate.

## Engineering Requirements
Every component receives Storybook story, unit test, controller test, accessibility test, and visual regression test.
