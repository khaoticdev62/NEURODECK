# Hybrid IDE UI Upgrade Ledger

Date: 2026-06-29

Program: VS Code x JetBrains IDE x Apple tvOS hybrid UI upgrade.

## Baseline Shell Audit

Current foundation before route migration:

- `ShellLayout` now mounts the HYBRID-3 workbench frame: title/command bar, Activity Bar, primary tool window, active content, secondary context tool window, bottom tool window, and status/controller action bar.
- Existing global overlays remain mounted: Command Palette, Activity/Notifications, Emergency Stop, Workspace Switcher, Quick Access, Context Help, Focus Debug, Power State, Screen Narrator, LAN Share platform bridge, and Agent tool execution bridge.
- `NavigationRail` still derives destinations from `FEATURE_CATALOG`; it is now used as the compact Activity Bar at the prompt-required 52 px width.
- `ContextPanel` remains the secondary tool-window content source until HYBRID-5 screen migrations replace route-local side panels.
- `tokens.css` remains the design-token source of truth; no new UI package or component library was added.

## Foundation Delivered In This Slice

- HYBRID-0: ledger created and route inventory established.
- HYBRID-1: semantic workbench tokens added for title bar, Activity Bar, tool windows, editor, panel, tabs, status bar, focus density, selected rows, active panes, and status colors.
- HYBRID-2: shared component entry points added under `src/renderer/src/components/workbench`.
- HYBRID-3: shell frame switched to canonical workbench regions while preserving route content and real integrations.

## Shared Components

Created for route-by-route migration:

- `NdxWorkbench`
- `NdxTitleBar`
- `NdxActivityBar`
- `NdxToolWindow`
- `NdxBottomPanel`
- `NdxStatusBar`
- `NdxFocusSurface`
- `NdxDenseRow`
- `NdxSpatialLockup`
- `NdxEditorShell`
- `NdxToolbarButton`
- `NdxIconButton`
- `NdxDialog`
- `NdxNotification`
- `NdxSettingsTree`
- `NdxSettingRow`

## Route Migration Matrix

Status legend:

- `Frame`: route renders inside the new workbench shell, but its internal layout is not yet migrated.
- `Pending IDE`: route should migrate to dense IDE/workbench patterns in HYBRID-4.
- `Pending Tool`: route should migrate to tool-window/inspector patterns in HYBRID-5.
- `Pending Spatial`: route should migrate to tvOS-style dashboard/grid lockups in HYBRID-6.
- `Pending Critical`: route should migrate through HYBRID-7 safety/dialog/settings rules.
- `Partial IDE`: internal route migration started; route still has named pending work before HYBRID-4 can close.

| Route | Screen | Current category | Hybrid target | Status | Main risks |
|---|---:|---|---|---|---|
| `/` | ND-008 | Dashboard | Spatial dashboard | Frame / Pending Spatial | focus scale overlap, real-data shelf density |
| `/search` | ND-010 | Tool | Search tool window | Frame / Pending IDE | result virtualization, preview focus |
| `/onboarding/welcome` | ND-003 | Dashboard | Spatial onboarding | Frame / Pending Spatial | large text, initial focus |
| `/onboarding/providers` | ND-005 | Critical setup | Settings/permission dialog | Frame / Pending Critical | secret entry, provider validation |
| `/onboarding/workspaces` | ND-006 | Dashboard | Spatial workspace grid | Frame / Pending Spatial | picker focus, empty state |
| `/onboarding/calibration` | ND-004 | Critical setup | Controller setup | Frame / Pending Critical | controller-only path |
| `/onboarding/tutorial` | ND-007 | Dashboard | Spatial learning | Frame / Pending Spatial | step focus restoration |
| `/boot` | ND-001 | Critical shell | Boot shell | Frame / Pending Critical | no overlay interference |
| `/ai` | ND-013 | IDE-heavy | AI command workbench | Partial IDE | per-step execution semantics still deferred |
| `/ai/timeline` | ND-014 | Tool-heavy | Timeline/log viewer | Frame / Pending Tool | long timeline focus |
| `/ai/approvals` | ND-015 | Critical | Permission review | Frame / Pending Critical | destructive review clarity |
| `/workspaces` | ND-018 | Dashboard | Spatial workspace row/grid | Frame / Pending Spatial | card focus overlap |
| `/workspaces/detail` | ND-019 | Tool-heavy | Project inspector | Frame / Pending Tool | filesystem actions |
| `/build` | ND-021 | IDE-heavy | Editor/workbench | Partial IDE | Monaco local bundling preserved; visual QA pending |
| `/files` | ND-026 | IDE-heavy | Explorer tool window | Partial IDE | deeper preview/editor affordances |
| `/git` | ND-025 | IDE-heavy | Source Control tool window | Partial IDE | conflict-resolution UI still deferred |
| `/terminal` | ND-028 | IDE-heavy | Bottom terminal panel | Partial IDE | direct xterm lifecycle preserved; visual QA pending |
| `/terminal/builder` | ND-029 | IDE-heavy | Command Builder | Partial IDE | reviewed execution preserved; visual QA pending |
| `/browser` | ND-030 | IDE-heavy | Browser tool/editor | Partial IDE | richer tab preview remains |
| `/browser/:tabId` | ND-031 | IDE-heavy | Browser editor group | Partial IDE | native view focus and bounds still require visual QA |
| `/automations` | ND-032 | Tool-heavy | Workflow library | Partial Tool | workflow tools/library/run-context framing; run detail pending |
| `/automations/forge` | ND-033 | IDE-heavy | Workflow canvas | Frame / Pending IDE | non-drag movement |
| `/automations/forge/:workflowId` | ND-033 | IDE-heavy | Workflow canvas | Frame / Pending IDE | inspector sync |
| `/automations/runs/:runId` | ND-034 | Tool-heavy | Run detail tabs | Frame / Pending Tool | logs/output focus |
| `/models` | ND-035 | Tool-heavy | Model grid/tool window | Partial Tool | provider setup/list/routing-context framing; visual QA pending |
| `/models/:providerId` | ND-036 | Tool-heavy | Model inspector | Partial Tool | provider/detail/policy framing; visual QA pending |
| `/models/routing-profiles` | ND-037 | Tool-heavy | Routing table | Partial Tool | profile list/preview/decision context framing; visual QA pending |
| `/agents` | ND-016 | Tool-heavy | Agent cards/detail | Partial Tool | factory/list/policy framing; detail route pending |
| `/agents/:agentId` | ND-017 | Tool-heavy | Agent detail tabs | Frame / Pending Tool | timeline and tool logs |
| `/learn` | ND-038 | Dashboard | Spatial learning rows | Frame / Pending Spatial | authored content gap |
| `/learn/lab/:curriculumId/:moduleId/:lessonId` | ND-039 | Dashboard | Guided lab workbench | Frame / Pending Spatial | lab step focus |
| `/remote` | ND-040 | IDE-heavy | Remote tool window | Partial IDE | non-SSH target types remain deferred |
| `/remote/:hostId` | ND-041 | IDE-heavy | Remote terminal panel | Partial IDE | remote xterm focus still needs visual QA |
| `/lan-share` | ND-LAN-001 | Tool-heavy | LAN Share tool | Frame / Pending Tool | transfer events |
| `/lan-share/peers` | ND-LAN-002 | Tool-heavy | Peer list | Frame / Pending Tool | trust badges |
| `/lan-share/peers/:peerId` | ND-LAN-003 | Critical/tool | Device trust detail | Frame / Pending Critical | trust decisions |
| `/lan-share/send` | ND-LAN-004 | Critical/tool | Send review | Frame / Pending Critical | file review |
| `/lan-share/transfers` | ND-LAN-007 | Tool-heavy | Transfers panel | Frame / Pending Tool | live updates |
| `/lan-share/transfers/:jobId` | ND-LAN-008 | Tool-heavy | Transfer detail | Frame / Pending Tool | cancellation/retry |
| `/lan-share/settings` | ND-LAN-017 | Settings | Settings tree | Frame / Pending Critical | group code privacy |
| `/system` | ND-042 | Tool-heavy | System dashboard | Frame / Pending Tool | diagnostics density |
| `/settings/controller` | ND-043 | Settings | Settings tree | Frame / Pending Critical | controller remap gaps |
| `/settings/display` | ND-044 | Settings | Settings tree | Frame / Pending Critical | theme interactions |
| `/settings/privacy` | ND-046 | Critical/settings | Permission matrix | Frame / Pending Critical | audit readability |
| `/settings/network` | ND-045 | Settings/tool | Network inspector | Frame / Pending Tool | read-only clarity |
| `/settings/updates` | ND-049 | Critical/settings | Update review | Frame / Pending Critical | install review |
| `/power` | ND-051 | Critical | Power dialog/screen | Frame / Pending Critical | irreversible host actions |
| `/about` | ND-056 | Tool-heavy | Diagnostics detail | Partial IDE | support bundle privacy preserved; visual QA pending |
| `/error-recovery` | ND-055 | Critical | Recovery dialog/screen | Partial IDE | crash recovery clarity preserved; visual QA pending |
| `/integrations` | ND-048 | Tool-heavy | Integrations tool | Frame / Pending Tool | provider grouping |
| `/extensions` | - | Tool-heavy | Extensions manager | Frame / Pending Tool | permissions/signature status |
| `/recovery` | ND-052 | Critical/tool | Recovery timeline | Frame / Pending Critical | restore review |
| `/storage` | ND-047 | Tool-heavy | Storage/recovery | Frame / Pending Tool | storage warnings |
| `/backup` | ND-X030 | Critical/tool | Backup review | Frame / Pending Critical | restore rollback |
| `/vault` | ND-X043 | Critical/tool | Vault tool | Frame / Pending Critical | reveal hiding |
| `/privacy` | ND-X050 | Critical/tool | Privacy data map | Frame / Pending Critical | data deletion |
| `/profiles` | ND-X042 | Tool-heavy | Profile manager | Frame / Pending Tool | session isolation wording |
| `/continuity` | ND-X044 | Tool-heavy | Continuity tool | Frame / Pending Tool | restore policy |
| `/devices` | ND-X032 | Dashboard/tool | Device grid | Frame / Pending Spatial | disabled controls |
| `/devices/bluetooth` | ND-X033 | Tool-heavy | Device detail | Frame / Pending Tool | unsupported actions |
| `/devices/audio` | ND-X034 | Tool-heavy | Device detail | Frame / Pending Tool | mic privacy |
| `/devices/display` | ND-X035 | Tool-heavy | Device detail | Frame / Pending Tool | display recovery |
| `/devices/storage` | ND-X036 | Tool-heavy | Device detail | Frame / Pending Tool | destructive storage actions |
| `/resource-governor` | ND-X037 | Tool-heavy | Resource tool | Frame / Pending Tool | live metrics |
| `/ai-workloads` | ND-X038 | Tool-heavy | Scheduler tool | Frame / Pending Tool | queue claims |
| `/scheduler` | ND-X039 | Tool-heavy | Trigger inventory | Frame / Pending Tool | disabled execution |
| `/help` | ND-X046 | Dashboard/tool | Help hub | Frame / Pending Spatial | help route density |
| `/troubleshooter` | ND-X057 | Critical/tool | Guided recovery | Frame / Pending Critical | fix claims |
| `/platform-health` | ND-X070 | Tool-heavy | Health overview | Frame / Pending Tool | aggregate errors |
| `/screenshots` | ND-X058 | Dashboard/media | Media surface | Frame / Pending Spatial | capture privacy |
| `/voice-notes` | ND-X059 | Dashboard/media | Media surface | Frame / Pending Spatial | transcript privacy |
| `/presentation` | ND-X064 | Settings/critical | Presentation settings | Frame / Pending Critical | in-progress local changes |

## Evidence

Foundation checks run for this slice:

```text
npm run test -- ShellLayout -> 1 file / 5 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed
```

HYBRID-4 partial checks run after Build Studio and Terminal chrome migration:

```text
npm run test -- BuildStudio UniversalTerminal -> 2 files / 5 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed
```

HYBRID-4 partial checks run after Files and Git workbench migration:

```text
npm run test -- FileManager WorkspaceGitTab GitControlCenter -> 3 files / 17 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed
```

HYBRID-4 partial checks run after Browser and Remote workbench migration:

```text
npm run test -- BrowserHub BrowserView RemoteSystems RemoteSession -> 4 files / 14 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed
```

HYBRID-4 partial checks run after AI Canvas and Command Builder workbench migration:

```text
npm run test -- AICommandCanvas CommandBuilder -> 3 files / 16 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed
```

HYBRID-4 partial checks run after diagnostics and recovery workbench migration:

```text
npm run test -- AboutDiagnostics ErrorRecovery -> 2 files / 11 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed
```

HYBRID-4 partial checks run after direct xterm workbench migration:

```text
npm run test -- UniversalTerminal TerminalViewport -> 2 files / 6 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed
```

HYBRID-4 partial checks run after Monaco workbench theming:

```text
npm run test -- BuildStudio -> 1 file / 1 test passed
npm run typecheck -> passed
npm run lint -> passed with unrelated kiosk Prettier warnings in local uncommitted files
npm run build -> passed
```

HYBRID-5 partial checks run after Agent Operations Center tool-window migration:

```text
npm run test -- AgentOperationsCenter -> 1 file / 6 tests passed
npm run typecheck -> passed
npm run lint -> passed with unrelated kiosk Prettier warnings in local uncommitted files
npm run build -> passed with existing ErrorRecovery dynamic/static import chunking warning
```

HYBRID-5 partial checks run after Model Control Center tool-window migration:

```text
npm run test -- ModelControlCenter -> 1 file / 5 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed with existing ErrorRecovery dynamic/static import chunking warning
```

HYBRID-5 partial checks run after Workflow Library tool-window migration:

```text
npm run test -- WorkflowLibrary -> 1 file / 4 tests passed
npm run typecheck -> passed
npm run lint -> blocked by unrelated scripts/sign-extension-manifest.mjs explicit-return/unused-var issues
npm run build -> passed with existing ErrorRecovery dynamic/static import chunking warning
```

HYBRID-5 partial checks run after Routing Profiles tool-window migration:

```text
npm run test -- RoutingProfiles -> 1 file / 3 tests passed
npm run typecheck -> passed
npm run lint -> blocked by unrelated scripts/sign-extension-manifest.mjs explicit-return and shareSheet Prettier issues
npm run build -> passed with existing ErrorRecovery dynamic/static import chunking warning
```

HYBRID-5 partial checks run after Model Provider Detail tool-window migration:

```text
npm run test -- ModelDetail -> 1 file / 3 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed with existing ErrorRecovery dynamic/static import chunking warning
```

## Remaining Program Work

- HYBRID-4 must continue IDE-heavy internal migration. Partial slice complete for `/build`
  shared project/editor/inspector framing, editor tabs, and breadcrumbs; partial slice complete for
  `/terminal` alternate-mode workbench framing; partial slice complete for `/files` Explorer +
  preview framing and `/git` Source Control + diff + Repository framing; partial slice complete
  for `/browser` tabs + native-view editor framing and `/remote` host/session framing; partial
  slice complete for `/ai` Intent + Plan Preview + Impact framing and `/terminal/builder`
  Command Blocks + Review framing; partial slice complete for `/about` Runtime + Diagnostics +
  Crash Reports framing and `/error-recovery` Error Details + Recovery + Actions framing; partial
  slice complete for `/terminal` Direct xterm framing while preserving `TerminalViewport`
  hydration, resize, input, search, copy, and disposal behavior; partial slice complete for
  Monaco workbench theming/popups while preserving local bundling and TypeScript worker behavior.
  HYBRID-4 is implementation-complete pending HYBRID-9 visual/controller evidence.
- HYBRID-5 must continue tool-heavy platform migrations. Partial slice complete for `/agents`
  Agent Factory + Agent Operations Center + Agent Policy framing while preserving persisted
  agent definitions, model routing, tool allowlists, enable/remove actions, and zero implicit
  permission ceiling grants. Partial slice complete for `/models` Provider Setup + Model Control
  Center + Routing Context framing while preserving provider list/add/remove/enable/test IPC
  behavior, encrypted cloud key boundaries, and real provider-probe semantics. Partial slice
  complete for `/models/:providerId` Provider + Model Provider Detail + Provider Policy framing
  while preserving provider lookup, removal, endpoint probe, Ollama runtime controls, and benchmark
  behavior. Partial slice complete for `/models/routing-profiles` Profiles + Routing Profiles +
  Decision Context framing while preserving real `routeModel` IPC preview behavior and
  private-workspace routing semantics. Partial slice complete for `/automations` Workflow Tools +
  Workflow Library + Run Context framing while preserving persisted workflow listing/removal and
  WorkflowRunnerProvider run submission. Remaining targets include `/agents/:agentId`,
  `/automations/runs/:runId`, Extensions, System, Permissions, Recovery, Backup, Vault, LAN Share,
  Devices, Profiles, Continuity, and Platform Health.
- HYBRID-6 must migrate dashboard/grid/media screens to spatial lockup primitives.
- HYBRID-7 must reconcile in-progress presentation-mode work before notification policy, kiosk, or sandbox flows.
- HYBRID-8 and HYBRID-9 need visual/controller/performance evidence at all target resolutions before any full-program completion claim.
