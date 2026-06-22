# NeuroDeck OS — Implementation Checklist

Derived directly from the Epic lists in `specs/NeuroDeck_OS_Production_Implementation_Mega_Prompt.md` (§37) and `specs/NeuroDeck_OS_Missing_Must_Have_Features_Implementation_Prompt.md` (§55). Work **Phase A to completion before starting Phase B**, per the bundle's `START_HERE` instruction — the supplemental phase must extend Phase A's shared services, not duplicate them.

Do not check an epic complete until every story within it satisfies the relevant Story Completion Template/Contract and the Acceptance Gates in §5 below. See `CLAUDE.md` for the non-negotiable rules that apply throughout.

---

## Phase A — Core Platform (mega-prompt Epics 0–12)

### Epic 0 — Baseline and safety ✅ complete

- [x] Repository audit (mega-prompt §4.1 discovery checklist)
- [x] `docs/implementation/NDX_IMPLEMENTATION_LEDGER.md` created and kept current
- [x] Build repair (project scaffolded and building)
- [x] Test baseline established
- [x] Security baseline applied (`docs/security/NDX_SECURITY_ARCHITECTURE.md`, Electron hardening per mega-prompt §6)
- [x] Mock/stub inventory completed (danger-pattern search, §4.2)
- [x] Dead-code analysis

### Epic 1 — Shell and design system

- [ ] Design tokens (mega-prompt §8.1)
- [ ] Core primitives (§8.2)
- [ ] Shell (top system rail, primary nav rail, bottom controller rail, context panel)
- [ ] Rails (Standard / Focus / Split / Overlay / Theater display modes)
- [ ] Global modals/overlays (confirmation, critical confirmation, permission, input overlay, AI radial menu, context menu, model/workspace pickers)
- [ ] Error boundaries
- [ ] Route registry
- [ ] Responsive 16:10 layout (1280×800 native, 1920×1080 / 2560×1440 docked)

### Epic 2 — Controller runtime

- [ ] Steam Input adapters
- [ ] Semantic actions (universal mapping + chorded controls + hold behavior, wireframe §4)
- [ ] Spatial Focus Engine (focus node contract, rules, visual state, wireframe §5)
- [ ] Haptics service
- [ ] Input profile manager
- [ ] Focus/controller debug overlay
- [ ] Focus traversal tests

### Epic 3 — Onboarding and global UX

- [ ] ND-001 Boot and Session Start
- [ ] ND-002 Lock Screen
- [ ] ND-003 First-Run Welcome
- [ ] ND-004 Controller Calibration
- [ ] ND-005 AI Provider Setup
- [ ] ND-006 Workspace Discovery
- [ ] ND-007 Guided Controller Tutorial
- [ ] ND-008 Home Command Center
- [ ] ND-009 Universal Command Palette
- [ ] ND-010 Global Search
- [ ] ND-011 Activity Center
- [ ] ND-012 Notification Center
- [ ] Quick overlay foundation (full ND-050 build deferred to Epic 11)

### Epic 4 — AI safety runtime

- [ ] Plan schema (mega-prompt §15.1)
- [ ] Typed tool call schema and registry (§15.2, §14)
- [ ] Permission broker (§16)
- [ ] ND-013 AI Command Canvas
- [ ] ND-014 AI Execution Timeline
- [ ] ND-015 Approval Queue
- [ ] ND-054 Emergency Stop
- [ ] Audit service
- [ ] Prompt-injection resistance verified (§15.4)

### Epic 5 — Workspaces and files

- [ ] Workspace Service (persistence, §19)
- [ ] Workspace discovery (ND-006 real backend)
- [ ] ND-018 Workspace Hub
- [ ] ND-019 Workspace Detail
- [ ] ND-020 Workspace Switcher
- [ ] File Service (§20)
- [ ] ND-026 File Manager
- [ ] ND-027 File Preview
- [ ] Recovery integration (checkpoints on file ops)

### Epic 6 — Terminal and Git

- [ ] Terminal Service / PTY (§21)
- [ ] ND-028 Universal Terminal
- [ ] ND-029 Command Builder
- [ ] AI intent-to-command proposals (reviewed, not auto-executed)
- [ ] Git Service (§22)
- [ ] ND-025 Git Control Center
- [ ] Diff views
- [ ] Git recovery branches

### Epic 7 — Build Studio

- [ ] ND-021 Build Studio shell/modes
- [ ] ND-022 Code Editor
- [ ] LSP integration
- [ ] ND-023 Symbol Navigator
- [ ] ND-024 Diagnostics and Problems
- [ ] Predictive editing
- [ ] Controller-native structural edits (§12 editor requirements)
- [ ] Editor tests

### Epic 8 — Agents and workflows

- [ ] Agent Runtime (§17)
- [ ] ND-016 Agent Operations Center
- [ ] ND-017 Agent Detail
- [ ] ND-032 Workflow Library
- [ ] ND-033 Workflow Forge (graph canvas, node types)
- [ ] Workflow Runtime / Workflow Engine (§25)
- [ ] Dry-run support
- [ ] Checkpoints
- [ ] ND-034 Workflow Run Detail

### Epic 9 — Models

- [ ] Model Router (§18)
- [ ] Provider adapters (§18.3)
- [ ] Local model runtime
- [ ] ND-037 Routing Profiles
- [ ] Resource-aware model selection
- [ ] ND-035 Model Control Center
- [ ] ND-036 Model Detail

### Epic 10 — Browser, remote, learning

- [ ] Browser Session Service (§24)
- [ ] ND-030 Browser Hub
- [ ] ND-031 Browser View
- [ ] Remote Systems Service (§26)
- [ ] ND-040 Remote Systems
- [ ] ND-041 Remote Session
- [ ] ND-038 Learning Hub
- [ ] ND-039 Guided Lab (with AI coach boundaries)

### Epic 11 — System integration

- [ ] System Metrics Service (real metrics, §27)
- [ ] ND-042 System Dashboard
- [ ] ND-043 Controller Settings
- [ ] ND-044 Display and Theme Settings
- [ ] ND-045 Network and VPN
- [ ] ND-046 Privacy and Permissions
- [ ] ND-047 Storage and Recovery
- [ ] ND-048 Integrations
- [ ] ND-049 Updates
- [ ] ND-050 Quick Access Overlay (full build)
- [ ] ND-051 Power Menu
- [ ] ND-052 Recovery Timeline
- [ ] ND-053 Before/After Diff
- [ ] ND-055 Error Recovery
- [ ] ND-056 About and Diagnostics

### Epic 12 — Packaging and hardening

- [ ] SteamOS packaging (Game Mode + Desktop Mode)
- [ ] Suspend/resume behavior
- [ ] Controller disconnect/reconnect handling
- [ ] Performance pass (§33 budgets)
- [ ] Security pass
- [ ] Accessibility pass (§32)
- [ ] Full E2E suite (Playwright Electron, §34.4)
- [ ] Release candidate cut

---

## Phase B — Platform Completion (supplemental Epics X1–X15)

> Prerequisite: Phase A complete. Every Phase B epic must reuse Phase A's shared services (settings, permissions, notifications, logging, task queue, model routing, file access, controller handling, recovery, search, provider management, secret storage) — never fork them.

### Epic X1 — Platform registry foundation

- [ ] Capability registry
- [ ] Feature registry
- [ ] Application registry
- [ ] Device registry
- [ ] Shared transaction framework
- [ ] New IPC contracts (§50)

### Epic X2 — Application ecosystem

- [ ] Application Library (discovery, record schema, §6)
- [ ] Package Center / Linux package lifecycle (§7)
- [ ] Flatpak adapter
- [ ] AppImage adapter
- [ ] Steam Shortcut Manager (§8)
- [ ] Launch profiles

### Epic X3 — Extension ecosystem

- [ ] Extension host and isolation (§9.3)
- [ ] Extension manifest (§9.2)
- [ ] Capability API (§9.4)
- [ ] Extension Manager UI
- [ ] Signed marketplace client (§10)
- [ ] Signing/verification, quarantine, failure containment (§9.6)
- [ ] Developer SDK (§11.1)
- [ ] CLI (§11.2)

### Epic X4 — Knowledge and memory

- [ ] Knowledge Vault (source types, ingestion pipeline, §12)
- [ ] Document parsers
- [ ] Indexing / embeddings
- [ ] Retrieval rules (§12.5)
- [ ] Scoped AI memory (§13) — inspectable, editable, exportable, deletable
- [ ] Prompt/persona/tool/skill libraries (§14)

### Epic X5 — Voice and multimodal

- [ ] Speech provider integration (§15.1)
- [ ] Push-to-talk / wake word (§15.2)
- [ ] Dictation pipeline (§15.3)
- [ ] TTS
- [ ] Screen/document capture (§16) with privacy review and redaction
- [ ] Document intake
- [ ] Voice notes

### Epic X6 — Clipboard, sharing, and transfer

- [ ] Clipboard Center (§17.1) with security controls (§17.2)
- [ ] Snippets (§17.3)
- [ ] Universal Share Sheet (§17.4)
- [ ] Download/Transfer Center (§18)
- [ ] LAN device discovery (§19.1)
- [ ] Secure peer transfer (§19.2–19.3)

### Epic X7 — Sync, backup, and migration

- [ ] Sync engine (syncable data classes, §20.1; exclusions §20.2)
- [ ] Conflict resolver (§20.4)
- [ ] Backup (scopes/destinations, §21.1–21.2)
- [ ] Restore (§21.3)
- [ ] Import/export formats (§21.4)
- [ ] Legacy/version migration (§21.5)

### Epic X8 — Device services

- [ ] Device and Peripheral Center (§22)
- [ ] Bluetooth Center (§23)
- [ ] Audio and Microphone Center (§24)
- [ ] Display and Dock Center (§25)
- [ ] Removable Storage Center (§26)
- [ ] Hot-plug behavior (§22.3)

### Epic X9 — Resource and scheduling

- [ ] Resource Governor (§27)
- [ ] AI Workload Scheduler (§28)
- [ ] Time/event Scheduler and Trigger Service (§29)
- [ ] Quiet hours / interruption policy

### Epic X10 — Profiles and identity

- [ ] User profiles / operating modes (§30)
- [ ] Guest/private session (§30.3)
- [ ] Identity, credentials, certificates, secrets vault (§31)
- [ ] SSH key references
- [ ] Lock policy

### Epic X11 — Continuity and offline operation

- [ ] Offline-first queue and connectivity states (§35)
- [ ] Reconnection handling (§35.3)
- [ ] Suspend/resume (§36.1)
- [ ] Crash recovery (§36.2)
- [ ] Session restore
- [ ] Safe Mode (§45)

### Epic X12 — Privacy and support

- [ ] Data lifecycle and privacy map (§37)
- [ ] Deletion verification (§37.2)
- [ ] Telemetry consent (§38.1–38.2)
- [ ] Crash reporting (§38.3)
- [ ] Support bundle (§38.4)

### Epic X13 — Internationalization and guidance

- [ ] Localization (§40.1)
- [ ] Input methods (§40.2)
- [ ] Help Hub (§41.1)
- [ ] Context help (§41.2)
- [ ] Guided troubleshooter (§41.3)

### Epic X14 — Media, notifications, and special modes

- [ ] Screenshot center (§42.1)
- [ ] Recording (§42.2)
- [ ] Voice notes (§42.3)
- [ ] Notification policy and interruption management (§43)
- [ ] Presentation mode (§46.1)
- [ ] Kiosk architecture (§46.2)
- [ ] Application sandbox and policy (§47)

### Epic X15 — Supply chain and production hardening

- [ ] SBOM generation
- [ ] Signing (§39)
- [ ] Release provenance
- [ ] Extension verification (cross-check with X3)
- [ ] Dependency review
- [ ] Compatibility / deprecation policy
- [ ] Platform Health Overview (§49)

### Supplemental screen inventory

- [ ] All screens enumerated in supplemental §5 (Supplemental Screen Inventory) implemented and cross-referenced to the epic that owns each one — do not duplicate ND-001–ND-056.

---

## Acceptance Gates (do not declare done without these)

### Core gates (mega-prompt §40)

- [ ] **Architecture:** renderer sandboxed; preload API narrow/typed; IPC schema-validated; core operations isolated; secrets protected; migrations exist; audit exists.
- [ ] **Controller:** all 56 core screens have initial focus; primary workflows are controller-complete; no focus traps; back behavior works; disconnect/reconnect works; controller hints accurate; predictive text-entry alternatives exist.
- [ ] **AI safety:** plans inspectable; tools typed; permissions scoped; destructive actions require review; emergency stop works; cancellation works; recovery metadata accurate; prompt injection cannot elevate tools.
- [ ] **Functionality:** file ops, terminal, Git, model connections, workflows, system metrics, browser sessions are all real (not mocked); workspace state persists; recovery restores verified state.
- [ ] **UI:** 1280×800 polished; docked layouts work; empty/loading/error/offline states exist; text readable; focus visible; no clipping/overlap; no inaccessible modal; no dead navigation.
- [ ] **Quality:** typecheck, lint, tests, build, package all pass; no critical console errors; no production mocks; no known critical/high security defects; docs match implementation.

### Supplemental gates (supplemental §57)

- [ ] **Application ecosystem:** real install/update/remove/verify for Flatpak/AppImage; Steam shortcuts functional.
- [ ] **Extensions:** capability-scoped, signed, quarantined on failure; no unrestricted access granted.
- [ ] **Knowledge and memory:** scoped, inspectable, deletable; retrieval respects workspace boundaries.
- [ ] **Voice and capture:** redaction works; privacy review gates capture; no silent recording.
- [ ] **Sync and backup:** conflict resolution verified; restore tested end-to-end.
- [ ] **Devices and dock:** hot-plug verified; capability detection accurate (no fabricated sensor data).
- [ ] **Resource and scheduler:** governor enforces policy; background jobs visible in Activity.
- [ ] **Profiles and vault:** guest mode isolated; secrets never exposed to renderer/extensions.
- [ ] **Platform lifecycle:** offline core operation verified per non-negotiable §3.6; Safe Mode functional.
