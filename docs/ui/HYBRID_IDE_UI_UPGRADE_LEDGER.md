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
| `/` | ND-008 | Dashboard | Spatial dashboard | Partial Spatial | focus scale overlap; visual QA pending |
| `/search` | ND-010 | Tool | Search tool window | Partial IDE | search scope/results/health framing; preview focus pending |
| `/onboarding/welcome` | ND-003 | Dashboard | Spatial onboarding | Partial Spatial | large text visual QA pending |
| `/onboarding/providers` | ND-005 | Critical setup | Settings/permission dialog | Partial Critical | provider category lockups; secret entry validation preserved |
| `/onboarding/workspaces` | ND-006 | Dashboard | Spatial workspace grid | Partial Spatial | picker focus preserved; visual QA pending |
| `/onboarding/calibration` | ND-004 | Critical setup | Controller setup | Partial Critical | controller-only path preserved; visual QA pending |
| `/onboarding/tutorial` | ND-007 | Dashboard | Spatial learning | Partial Spatial | shared editor/spatial framing; step focus restoration preserved; viewport evidence added |
| `/boot` | ND-001 | Critical shell | Boot shell | Partial Critical | shared boot-state/failure framing; no overlay interference preserved |
| `/ai` | ND-013 | IDE-heavy | AI command workbench | Partial IDE | per-step execution semantics still deferred |
| `/ai/timeline` | ND-014 | Tool-heavy | Timeline/log viewer | Frame / Pending Tool | long timeline focus |
| `/ai/approvals` | ND-015 | Critical | Permission review | Partial Critical | approval queue editor/review-policy framing; visual QA pending |
| `/workspaces` | ND-018 | Dashboard | Spatial workspace row/grid | Partial Spatial | card focus overlap visual QA pending |
| `/workspaces/detail` | ND-019 | Tool-heavy | Project inspector | Partial Tool | workspace tool/detail/scope framing; filesystem actions preserved |
| `/build` | ND-021 | IDE-heavy | Editor/workbench | Partial IDE | Monaco local bundling preserved; visual QA pending |
| `/files` | ND-026 | IDE-heavy | Explorer tool window | Partial IDE | deeper preview/editor affordances |
| `/git` | ND-025 | IDE-heavy | Source Control tool window | Partial IDE | conflict-resolution UI still deferred |
| `/terminal` | ND-028 | IDE-heavy | Bottom terminal panel | Partial IDE | direct xterm lifecycle preserved; visual QA pending |
| `/terminal/builder` | ND-029 | IDE-heavy | Command Builder | Partial IDE | reviewed execution preserved; visual QA pending |
| `/browser` | ND-030 | IDE-heavy | Browser tool/editor | Partial IDE | richer tab preview remains |
| `/browser/:tabId` | ND-031 | IDE-heavy | Browser editor group | Partial IDE | native view focus and bounds still require visual QA |
| `/automations` | ND-032 | Tool-heavy | Workflow library | Partial Tool | workflow tools/library/run-context framing; visual QA pending |
| `/automations/forge` | ND-033 | IDE-heavy | Workflow canvas | Partial IDE | workflow tools/editor/run-safety framing; non-drag movement pending |
| `/automations/forge/:workflowId` | ND-033 | IDE-heavy | Workflow canvas | Partial IDE | workflow tools/editor/run-safety framing; inspector sync pending |
| `/automations/runs/:runId` | ND-034 | Tool-heavy | Run detail tabs | Partial Tool | run summary/timeline/actions framing; visual QA pending |
| `/models` | ND-035 | Tool-heavy | Model grid/tool window | Partial Tool | provider setup/list/routing-context framing; visual QA pending |
| `/models/:providerId` | ND-036 | Tool-heavy | Model inspector | Partial Tool | provider/detail/policy framing; visual QA pending |
| `/models/routing-profiles` | ND-037 | Tool-heavy | Routing table | Partial Tool | profile list/preview/decision context framing; visual QA pending |
| `/agents` | ND-016 | Tool-heavy | Agent cards/detail | Partial Tool | factory/list/policy framing; detail route pending |
| `/agents/:agentId` | ND-017 | Tool-heavy | Agent detail tabs | Partial Tool | profile/detail/run-context framing; visual QA pending |
| `/learn` | ND-038 | Dashboard | Spatial learning rows | Partial Spatial | authored content gap; visual QA pending |
| `/learn/lab/:curriculumId/:moduleId/:lessonId` | ND-039 | Dashboard | Guided lab workbench | Partial Spatial | instruction/tool/editor/coach framing; lab terminal and coach behavior preserved |
| `/remote` | ND-040 | IDE-heavy | Remote tool window | Partial IDE | non-SSH target types remain deferred |
| `/remote/:hostId` | ND-041 | IDE-heavy | Remote terminal panel | Partial IDE | remote xterm focus still needs visual QA |
| `/lan-share` | ND-LAN-001 | Tool-heavy | LAN Share tool | Partial Tool | service/control/network-policy framing; visual QA pending |
| `/lan-share/peers` | ND-LAN-002 | Tool-heavy | Peer list | Partial Tool | discovery/peer-inventory/trust-policy framing; visual QA pending |
| `/lan-share/peers/:peerId` | ND-LAN-003 | Critical/tool | Device trust detail | Partial Tool | peer identity/device detail/trust-policy framing; visual QA pending |
| `/lan-share/send` | ND-LAN-004 | Critical/tool | Send review | Partial Tool | send context/composer/preflight-policy framing; visual QA pending |
| `/lan-share/transfers` | ND-LAN-007 | Tool-heavy | Transfers panel | Partial Tool | queue/monitor/approval-policy framing; visual QA pending |
| `/lan-share/transfers/:jobId` | ND-LAN-008 | Tool-heavy | Transfer detail | Partial Tool | transfer state/detail/action-policy framing; visual QA pending |
| `/lan-share/settings` | ND-LAN-017 | Settings | Settings tree | Partial Tool | settings scope/preferences/security-policy framing; visual QA pending |
| `/system` | ND-042 | Tool-heavy | System dashboard | Partial Tool | system tools/metrics/scope framing; visual QA pending |
| `/settings/controller` | ND-043 | Settings | Settings tree | Partial Critical | settings tree/editor/scope framing; controller remap gaps |
| `/settings/display` | ND-044 | Settings | Settings tree | Partial Critical | settings tree/editor/scope framing; theme interactions |
| `/settings/privacy` | ND-046 | Critical/settings | Permission matrix | Partial Critical | settings tree/editor/security framing; audit readability |
| `/settings/network` | ND-045 | Settings/tool | Network inspector | Partial Tool | network tools/diagnostics/scope framing; visual QA pending |
| `/settings/updates` | ND-049 | Critical/settings | Update review | Partial Critical | settings tree/editor/release-policy framing; install review |
| `/power` | ND-051 | Critical | Power dialog/screen | Partial Critical | editor/host-safety framing; irreversible host actions still blocked |
| `/about` | ND-056 | Tool-heavy | Diagnostics detail | Partial IDE | support bundle privacy preserved; visual QA pending |
| `/error-recovery` | ND-055 | Critical | Recovery dialog/screen | Partial IDE | crash recovery clarity preserved; visual QA pending |
| `/integrations` | ND-048 | Tool-heavy | Integrations tool | Partial Tool | integration groups/inventory/scope framing; visual QA pending |
| `/extensions` | - | Tool-heavy | Extensions manager | Partial Tool | extension sources/inventory/trust-policy framing; visual QA pending |
| `/recovery` | ND-052 | Critical/tool | Recovery timeline | Partial Critical | shared timeline/detail framing; restore review preserved |
| `/storage` | ND-047 | Tool-heavy | Storage/recovery | Partial Tool | storage scope/recovery/storage-policy framing; visual QA pending |
| `/backup` | ND-X030 | Critical/tool | Backup review | Partial Critical | editor/restore-policy framing; restore rollback preserved |
| `/vault` | ND-X043 | Critical/tool | Vault tool | Partial Tool | vault guardrails/secret-inventory/reveal-policy framing; visual QA pending |
| `/privacy` | ND-X050 | Critical/tool | Privacy data map | Partial Critical | editor/deletion-policy framing; data deletion preserved |
| `/profiles` | ND-X042 | Tool-heavy | Profile manager | Partial Tool | profile session/manager/scope framing; visual QA pending |
| `/continuity` | ND-X044 | Tool-heavy | Continuity tool | Partial Tool | continuity state/center/restore-policy framing; visual QA pending |
| `/devices` | ND-X032 | Dashboard/tool | Device grid | Partial Tool | device classes/peripheral-inventory/capability-policy framing; visual QA pending |
| `/devices/bluetooth` | ND-X033 | Tool-heavy | Device detail | Partial Tool | Bluetooth scope/inventory/operation-policy framing; visual QA pending |
| `/devices/audio` | ND-X034 | Tool-heavy | Device detail | Partial Tool | audio scope/inventory/operation-policy framing; visual QA pending |
| `/devices/display` | ND-X035 | Tool-heavy | Device detail | Partial Tool | display scope/inventory/rollback-policy framing; visual QA pending |
| `/devices/storage` | ND-X036 | Tool-heavy | Device detail | Partial Tool | storage scope/inventory/recovery-policy framing; visual QA pending |
| `/resource-governor` | ND-X037 | Tool-heavy | Resource tool | Partial Tool | governor profiles/resource metrics/action scope framing; visual QA pending |
| `/ai-workloads` | ND-X038 | Tool-heavy | Scheduler tool | Partial Tool | workload classes/capacity/scheduler scope framing; visual QA pending |
| `/scheduler` | ND-X039 | Tool-heavy | Trigger inventory | Partial Tool | trigger inventory/scheduler inventory/permission policy framing; visual QA pending |
| `/help` | ND-X046 | Dashboard/tool | Help hub | Partial Spatial | help cards use spatial lockups; route density pending visual QA |
| `/troubleshooter` | ND-X057 | Critical/tool | Guided recovery | Partial Critical | editor/fix-policy framing; fix claims preserved |
| `/platform-health` | ND-X070 | Tool-heavy | Health overview | Partial Tool | health sources/overview/policy framing; visual QA pending |
| `/screenshots` | ND-X058 | Dashboard/media | Media surface | Partial Spatial | capture and media cards use spatial lockups; privacy path preserved |
| `/voice-notes` | ND-X059 | Dashboard/media | Media surface | Partial Spatial | note cards use spatial lockups; transcript privacy preserved |
| `/presentation` | ND-X064 | Settings/critical | Presentation settings | Partial Critical | settings tree/editor/policy framing; in-progress local changes preserved |

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

HYBRID-5 partial checks run after Workflow Run Detail tool-window migration:

```text
npm run test -- WorkflowRunDetail -> 1 file / 4 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed with existing ErrorRecovery dynamic/static import chunking warning
```

HYBRID-5 partial checks run after Agent Detail tool-window migration:

```text
npm run test -- AgentDetail -> 1 file / 10 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed with existing ErrorRecovery dynamic/static import chunking warning
```

HYBRID-5 partial checks run after System Dashboard tool-window migration:

```text
npm run test -- SystemDashboard -> 1 file / 4 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed with existing ErrorRecovery dynamic/static import chunking warning
```

HYBRID-5 partial checks run after platform tools batch migration:

```text
npm run test -- NetworkAndVpn Integrations StorageAndRecovery PlatformHealthOverview -> 4 files / 13 tests passed
npm run test -- Profiles ContinuityCenter ResourceGovernor AIWorkloadScheduler SchedulerTriggers -> 7 files / 18 tests passed
npm run test -- ExtensionManager Vault BluetoothDevices AudioMicrophoneCenter DisplayDockCenter RemovableStorageCenter DevicePeripheralCenter -> 9 files / 46 tests passed
npm run test -- LanShare -> 21 files / 101 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed with existing ErrorRecovery dynamic/static import chunking warning
```

HYBRID-6 partial checks run after dashboard, grid, and media spatial migration:

```text
npm run test -- HomeCommandCenter WorkspaceHub LearningHub HelpHub ScreenshotCenter VoiceNotesCenter -> 6 files / 23 tests passed
```

HYBRID-7 partial checks run after settings, safety, restore, and policy surface migration:

```text
npm run test -- ControllerSettings DisplayThemeSettings PrivacyPermissions Updates PowerMenu BackupAndRestore PrivacyDataMap RecoveryTimeline GuidedTroubleshooter ApprovalQueue PresentationModeSettingsScreen NotificationPolicyScreen KioskModeSettings -> 17 files / 71 tests passed
```

HYBRID-6/7 follow-up checks run after search, workspace detail, workflow forge, and onboarding spatial/critical migration:

```text
npm run test -- GlobalSearch WorkspaceDetail WorkflowForge -> 4 files / 17 tests passed
npm run test -- FirstRunWelcome AIProviderSetup WorkspaceDiscovery ControllerCalibration -> 5 files / 26 tests passed
npm run test -- HomeCommandCenter WorkspaceHub LearningHub HelpHub ScreenshotCenter VoiceNotesCenter GlobalSearch WorkspaceDetail WorkflowForge FirstRunWelcome AIProviderSetup WorkspaceDiscovery ControllerCalibration ControllerSettings DisplayThemeSettings PrivacyPermissions Updates PowerMenu BackupAndRestore PrivacyDataMap RecoveryTimeline GuidedTroubleshooter ApprovalQueue PresentationModeSettingsScreen NotificationPolicyScreen KioskModeSettings -> 32 files / 137 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed with existing ErrorRecovery dynamic/static import chunking warning
```

HYBRID-6/7/8 closure checks run after Guided Controller Tutorial, Guided Lab, and Boot-state migration:

```text
npm run test -- GuidedControllerTutorial GuidedLab BootSessionStart -> 3 files / 18 tests passed
npm run typecheck -> passed
npm run lint -> passed
npm run build -> passed with existing ErrorRecovery dynamic/static import chunking warning
npm run test:e2e -- hybrid-ui.spec.ts -> 1 file / 1 test passed across 1280x800, 1920x1080, and 2560x1440 route viewport checks
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
- HYBRID-5 tool-heavy platform migrations are broadly partial-complete through the shared
  workbench primitives. Partial slice complete for `/agents`
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
  WorkflowRunnerProvider run submission. Partial slice complete for `/automations/runs/:runId`
  Run Summary + Workflow Run Detail + Run Actions framing while preserving live-run precedence,
  persisted run fallback, approval resolution, cancel action, and timeline messages. Partial slice
  complete for `/agents/:agentId` Agent Profile + Agent Detail + Run Context framing while
  preserving start-run, dry-run, pause/resume, cancel, tool execution tabs, file tabs, permissions,
  audit log filtering, and live `agentRun.update` behavior. Partial slice complete for `/system`
  System Tools + Metrics + Metrics Scope framing while preserving typed system metrics IPC,
  manual refresh, unavailable-sensor honesty, and navigation to system-area tools. Partial slice
  complete for `/settings/network`, `/integrations`, `/storage`, `/profiles`, `/continuity`,
  `/resource-governor`, `/ai-workloads`, `/scheduler`, `/platform-health`, `/extensions`, `/vault`,
  `/devices`, `/devices/bluetooth`, `/devices/audio`, `/devices/display`, `/devices/storage`, and
  all LAN Share routes while preserving their existing IPC-backed behavior and honest deferred
  controls. Remaining HYBRID-5 targets are deeper per-route inspectors, trusted publishers, and
  route-specific visual/controller evidence rather than new parallel platform UI systems.
- HYBRID-6 partial spatial migration is complete for Home, Workspaces, Learning Hub, Help Hub,
  Screenshot Center, Voice Notes, onboarding welcome, workspace discovery, Guided Controller
  Tutorial, and Guided Lab. Route viewport evidence now covers the last two remaining spatial
  targets at 1280x800, 1920x1080, and 2560x1440.
- HYBRID-7 partial critical/settings migration is complete for controller/display/privacy/update
  settings, power, recovery, backup, privacy data map, guided troubleshooter, approval queue,
  presentation, notification policy, kiosk mode, AI provider setup, controller calibration, and
  Boot-state treatment. Remaining HYBRID-7 work is deeper full-program dialog-standardization
  coverage rather than any known un-migrated critical route in this slice.
- HYBRID-8 route-level responsive evidence has started with `e2e/hybrid-ui.spec.ts` for the final
  pending hybrid routes. HYBRID-9 still needs broader full-program visual/controller/performance
  evidence before claiming every route in the product has been visually QA'd.
