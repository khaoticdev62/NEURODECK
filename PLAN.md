# NeuroDeckOS Hybrid IDE UI Upgrade Program

## Summary

Implement the VS Code x JetBrains x Apple tvOS hybrid UI as a phased program, not one giant rewrite. Preserve all real IPC, services, controller behavior, routes, persistence, security gates, and existing uncommitted presentation-mode work. Use the current repo shape instead of adding a new monorepo package: tokens stay in `src/renderer/src/assets/tokens.css`, shared components stay under `src/renderer/src/components`.

Current local caveat: there are uncommitted presentation/display-setting changes and three untracked prompt docs. The implementer must not overwrite or stage unrelated work.

## Key Changes

- **HYBRID-0 Audit and ledger**
  - Create `docs/ui/HYBRID_IDE_UI_UPGRADE_LEDGER.md`.
  - Inventory every route from `ROUTE_DEFINITIONS`, current layout category, migration status, focus/controller risks, responsive risks, and test evidence.
  - Record current shell anatomy: `ShellLayout`, `SystemRail`, `NavigationRail`, `ContextPanel`, `BottomControllerRail`, focus engine, command palette, overlays, Monaco, xterm, and route groups.
  - Add checklist entries to `IMPLEMENTATION_CHECKLIST.md` without claiming completion.

- **HYBRID-1 Tokens and themes**
  - Expand existing CSS tokens with semantic workbench aliases: title bar, activity bar, tool window, editor, panel, tab, status bar, dense focus, spatial focus, active pane, selected row, warning/error/success/info.
  - Add density/theme attributes for Hybrid Dark, OLED Black, High Contrast Dark, Reduced Transparency, Docked Dense, Large Text.
  - Keep existing `data-reduce-motion`, `data-high-contrast`, and `data-text-size` behavior.

- **HYBRID-2 Shared primitives**
  - Build centralized primitives in the existing component tree: `NdxWorkbench`, `NdxTitleBar`, `NdxActivityBar`, `NdxToolWindow`, `NdxEditorShell`, `NdxEditorTabs`, `NdxBottomPanel`, `NdxStatusBar`, `NdxFocusSurface`, `NdxDenseRow`, `NdxSpatialLockup`, `NdxToolbarButton`, `NdxIconButton`, `NdxDialog`, `NdxNotification`, `NdxSettingsTree`, `NdxSettingRow`.
  - Keep current primitives as compatibility wrappers where useful; do not break feature screens in the same commit.
  - Create one icon registry replacing ad hoc screen icons over time.

- **HYBRID-3 Workbench shell**
  - Replace the current simple shell with the canonical workbench layout:
    - Title/Command Bar
    - Activity Bar
    - Primary Tool Window
    - Active content/editor area
    - Optional Secondary Tool Window
    - Bottom Tool Window
    - Status/Controller Action Bar
  - Reuse existing route registry and feature catalog for Activity Bar destinations.
  - Persist tool-window open/collapsed/pinned/size state locally through existing renderer state first; add IPC only if cross-process persistence is required later.
  - Keep all global overlays mounted: Command Palette, Activity/Notifications, Emergency Stop, Workspace Switcher, Quick Access, Context Help, Lock Screen.

- **HYBRID-4 IDE-heavy screens**
  - Migrate Build Studio, Files, Git, Terminal, Browser, Remote Sessions, AI Command Canvas, Command Builder, and diagnostics-like routes to workbench-first layouts.
  - Add editor tabs, breadcrumbs, bottom panel tabs, terminal chrome, active pane borders, and dense row focus.
  - Preserve Monaco local bundling and xterm lifecycle/disposal behavior.

- **HYBRID-5 Tool-heavy platform screens**
  - Migrate Agents, Workflows, Models, Extensions, System, Permissions, Recovery, Backup, Vault, LAN Share, Devices, Profiles, Continuity, Platform Health.
  - Use primary/secondary tool windows for inspectors, metadata, permissions, logs, and context rather than page-local side panels.
  - Keep destructive actions behind existing confirmation/critical confirmation patterns.

- **HYBRID-6 tvOS-heavy dashboards and grids**
  - Migrate Home, Workspaces, Learning, model/device/application-style grids, Quick Access, Screenshot/Voice media surfaces.
  - Use spatial lockups only for dashboard/grid content, not dense IDE rows, terminal, logs, or tables.
  - Ensure focus scale never causes overlap at 1280x800.

- **HYBRID-7 Settings and critical flows**
  - Convert settings to JetBrains-style `Category Tree | Settings Editor | Context Help`.
  - Standardize permission/install/delete/restore/update dialogs using shared dialog primitives.
  - Add quiet/presentation/sandbox notification policy UI only after existing in-progress presentation-mode work is reconciled.

- **HYBRID-8 Responsive, accessibility, and controller hardening**
  - Validate 1280x800, 1280x720, 1920x1080, 2560x1440, large text, high contrast, reduced motion.
  - Add controller layer labels to status/action bar.
  - Ensure every route has initial focus, Back behavior, focus restoration, no hover-only workflows, no drag-only workflows.

- **HYBRID-9 Visual QA and final evidence**
  - Add Playwright screenshot coverage for representative routes per category first, then expand route-by-route.
  - Store screenshots with `<screen-id>__<resolution>__<theme>__<state>.png`.
  - Final report must include fidelity matrix, component inventory, screen migration matrix, controller matrix, accessibility/responsive/performance results, and remaining issues.

## Interfaces and State

- No production IPC changes for the foundation phases unless a feature already needs main-process persistence.
- Renderer-facing shell state should use typed React state/hooks first:
  - active activity destination
  - primary/secondary tool-window visibility
  - bottom-panel tab/open state
  - tool-window split sizes
  - density/theme attributes
- If persistence is added later, extend the existing typed IPC pattern: shared contract, IPC channel, main handler, preload bridge, renderer client.
- Keep `FEATURE_CATALOG` as the Activity Bar destination source; do not create a second route list.

## Test Plan

- Run after each phase:
  - `npm run typecheck`
  - `npm run lint`
  - targeted `npm run test -- <changed-area>`
  - `npm run build`
- Shell/workbench tests:
  - renders all canonical regions
  - focus/focus-mode collapse behavior
  - Activity Bar destination visibility from feature registry
  - bottom panel open/close and selected tab
  - reduced motion/high contrast/large text attributes
- Controller tests:
  - initial focus per migrated route
  - Back restores prior focus
  - no dead-end focus paths
  - modal trap and restore
  - pane/tool switching
- Visual QA:
  - capture at 1280x800 first
  - then 1280x720, 1920x1080, 2560x1440
  - include large text, high contrast, reduced motion states before claiming migration complete.

## Assumptions

- The untracked mega-prompt remains reference material unless the user explicitly asks to commit it.
- Existing uncommitted presentation-mode work is user/agent work in progress and must be preserved.
- No new component library is introduced.
- No Storybook dependency is added initially; create an internal component workshop/test harness only if needed for visual QA.
- Major phase completions should be committed and pushed to GitHub, following the repo instruction.
