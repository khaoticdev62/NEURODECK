# Engineering Volumes I–IV — Core Architecture, UI, Scaffold, Build Tickets

## Volume I — Core Engineering Architecture

### Controller Action Registry
Everything is an action. Physical mappings dispatch semantic actions.

```ts
export enum ActionId {
  NAV_UP, NAV_DOWN, NAV_LEFT, NAV_RIGHT,
  ACCEPT, CANCEL, BACK,
  OPEN_PROMPT_LIBRARY, OPEN_COMMAND_PALETTE,
  ACCEPT_SUGGESTION, NEXT_SUGGESTION, PREVIOUS_SUGGESTION,
  EXECUTE_PROMPT, SAVE_PROMPT, PIN_PROMPT,
  START_MACRO_RECORDING, STOP_MACRO_RECORDING,
  SWITCH_AGENT, NEW_SESSION, OPEN_SETTINGS
}
```

### Application State

```ts
export interface AppState {
  session: SessionState;
  workspace: WorkspaceState;
  promptDrive: PromptDriveState;
  agents: AgentState;
  memory: MemoryState;
  models: ModelState;
  telemetry: TelemetryState;
  controller: ControllerState;
  settings: SettingsState;
}
```

### Electron Process Architecture
Main owns controller runtime, command runtime, agent runtime, storage, plugin host, IPC. Renderer owns workspace, prompt composer, agent console, settings, diagnostics.

### IPC Channels
prompt:create, prompt:update, prompt:execute, prompt:delete, agent:switch, agent:execute, macro:start, macro:stop, macro:execute, settings:update, project:open, project:scan, telemetry:get.

## Volume II — UI, State, Interaction Runtime

Frontend structure includes screens for Workspace, PromptComposer, PromptLibrary, CommandPalette, ControllerMapper, MacroRecorder, AgentConsole, Diagnostics, Settings.

Use Zustand or equivalent for fast local state. Prompt composer state tracks active template, active category, prompt blocks, selected slot, suggestions, preview.

## Volume III — Code Scaffold Blueprint

Monorepo packages: controller-runtime, promptdrive-core, autocomplete-engine, command-runtime, macro-engine, agent-runtime, storage, shared-types.

Shared types include RiskLevel, ControllerBinding, PromptTemplate, PromptSlot, CommandDefinition, MacroDefinition, MacroStep.

SQLite migrations cover prompts, prompt_slots, commands, macros, macro_steps, controller_profiles, agents.

## Volume IV — Build Tickets

First 50 tickets:

1. Create monorepo
2. Add pnpm workspace
3. Add TypeScript base config
4. Add Electron desktop app
5. Add React renderer
6. Add Tailwind
7. Add shared-types package
8. Add storage package
9. Add SQLite migrations
10. Add prompt repository
11. Add macro repository
12. Add agent repository
13. Add controller profile repository
14. Add controller-runtime package
15. Add action registry
16. Add Steam Deck default bindings
17. Add tap/hold/chord detector
18. Add promptdrive-core package
19. Add prompt parser
20. Add slot resolver
21. Add prompt validator
22. Add prompt preview engine
23. Add prompt pack loader
24. Add prompt pack validator
25. Add autocomplete-engine package
26. Add trie index
27. Add fuzzy matcher
28. Add ranking engine
29. Add command-runtime package
30. Add command registry
31. Add default commands
32. Add command confirmation system
33. Add macro-engine package
34. Add macro recorder
35. Add macro player
36. Add macro validator
37. Add agent-runtime package
38. Add default agents
39. Add agent switcher
40. Add Electron IPC contracts
41. Add preload API
42. Add renderer app shell
43. Add Zustand stores
44. Add Workspace screen
45. Add Prompt Composer screen
46. Add Prompt Library screen
47. Add Command Palette screen
48. Add Controller Mapper screen
49. Add Macro Recorder screen
50. Add Agent Console screen
