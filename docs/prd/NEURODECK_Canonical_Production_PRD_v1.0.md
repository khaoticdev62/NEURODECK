# NEURODECK Canonical Production PRD v1.0

**Project:** NEURODECK  
**Document Type:** Canonical Product Requirements Document  
**Version:** 1.0 Production PRD  
**Status:** Build-Ready Draft  
**Primary Framework:** Electron + React + TypeScript + Tailwind CSS  
**Primary Device Target:** Steam Deck LCD/OLED, SteamOS Game Mode, SteamOS Desktop Mode  
**Secondary Targets:** Windows 11, desktop Linux, macOS  
**Generated:** 2026-06-09  
**Owner:** Khaotic Labs / NEURODECK  

---

## 0. Purpose of This Document

This PRD is the canonical production contract for NEURODECK v1.0. It replaces fragmented planning notes with one product truth that engineering, design, QA, security, packaging, and AI coding agents can build against.

NEURODECK is now defined as a secure Electron desktop application with a Steam Deck-first user experience. It must preserve the original tactical AI workstation vision while using a modern desktop app architecture: Electron main process, secure preload bridge, React renderer, typed IPC, local model orchestration, Hermes/Lua extension support, and Steam Deck Game Mode packaging.

This document defines:

- What NEURODECK v1.0 is
- Who it serves
- What features are in scope
- What features are deferred
- How Electron must be used safely
- What must work on Steam Deck
- What quality gates must pass before release
- What “done” means

---

## 1. Product Overview

### 1.1 Product Name

**NEURODECK**

### 1.2 One-Line Description

NEURODECK turns the Steam Deck into a secure, controller-first AI workstation for chatting with models, managing agents, using local memory, running project automation, and launching AI-powered workflows from Game Mode.

### 1.3 Product Category

NEURODECK sits between:

- AI workspace
- Developer tool
- Tactical dashboard
- Console-native productivity environment
- Local model control center
- Plugin-enabled automation shell

### 1.4 Product Mission

Transform the Steam Deck into a handheld AI workstation that feels like a native operating environment rather than a generic web wrapper.

### 1.5 Product Vision

NEURODECK should feel like a premium AI-native workstation that could have shipped with SteamOS itself: fast, controller-first, secure, local-first, immersive, and useful without needing a desktop keyboard glued to the user’s lap.

### 1.6 Product Promise

A user can launch NEURODECK from Steam Deck Game Mode, select or configure an AI model, manage sessions, interact with agents, use memory, run trusted extensions, and continue work across handheld, docked, and desktop scenarios without fighting the interface.

---

## 2. Canonical Product Definition

### 2.1 NEURODECK v1.0 Is

NEURODECK v1.0 is a local-first Electron app that provides:

1. AI chat workspace
2. Local and remote model provider management
3. Session management
4. Persona and agent selection
5. Local memory/context management
6. Secure settings and secrets handling
7. Hermes/Lua extension command hub
8. Diagnostics and telemetry dashboard
9. Steam Deck Game Mode launcher support
10. Controller-first navigation system
11. Tactical Glass visual design system
12. Secure IPC-based desktop architecture
13. AppImage-first Steam Deck packaging path
14. Windows/macOS/Linux desktop packaging path

### 2.2 NEURODECK v1.0 Is Not

NEURODECK v1.0 is not:

- A generic ChatGPT clone
- A browser wrapper
- A Steam Deck webview shortcut
- A terminal-only TUI application
- A cloud-only SaaS app
- A model training platform
- A public plugin marketplace
- A remote code execution playground
- A security tool that bypasses app or platform protections
- A system-level SteamOS modification
- A Decky Loader replacement
- A secret manager with enterprise compliance guarantees
- A full IDE in v1.0

### 2.3 Product North Star

A user should be able to do useful AI work on the Steam Deck using only controller controls, with no fragile setup, no exposed secrets, no unreadable UI, and no “this is clearly a desktop website in disguise” feeling.

---

## 3. Target Users

### 3.1 Primary Persona: Solo AI Builder

**Profile:** Indie developer, mod creator, technical learner, or AI-assisted builder who wants to work from a Steam Deck or handheld PC.

**Needs:**

- Launch AI tools from Game Mode
- Run local/offline models when possible
- Store sessions and project context
- Use agents for coding, planning, QA, and documentation
- Avoid complex Linux setup
- Navigate without keyboard/mouse

**Pain Points:**

- AI tools are usually browser-first
- Desktop apps are not Deck-friendly
- Linux setup can be fragile
- Local model tooling is scattered
- Controller input is usually an afterthought

### 3.2 Secondary Persona: Security/IT Learner

**Profile:** Service desk analyst, SOC learner, homelab user, TryHackMe/CTF learner, or cybersecurity student.

**Needs:**

- Fast access to AI explanation and study workflows
- Secure local notes/memory
- Plugin-driven workflows
- Steam Deck-friendly UI for labs and learning

### 3.3 Secondary Persona: Power User / AI Operator

**Profile:** User managing multiple models, personas, prompts, and local automations.

**Needs:**

- Model routing
- Diagnostics
- Token/memory visibility
- Plugins/extensions
- Session export/import
- Advanced settings

---

## 4. Platform Targets

### 4.1 Primary Platform

| Platform | Status | Required for v1.0 |
|---|---:|---:|
| Steam Deck LCD | Primary | Yes |
| Steam Deck OLED | Primary | Yes |
| SteamOS Game Mode | Primary | Yes |
| SteamOS Desktop Mode | Primary | Yes |

### 4.2 Secondary Platforms

| Platform | Status | Required for v1.0 |
|---|---:|---:|
| Windows 11 | Supported | Yes |
| Desktop Linux | Supported | Yes |
| macOS | Supported | Yes, packaging can be beta-quality |

### 4.3 Non-Required Platforms for v1.0

- iOS
- Android
- Web-only deployment
- Browser extension
- Steam Store release
- Decky plugin release

---

## 5. Strategic Goals

### 5.1 Product Goals

| Goal ID | Goal | Success Signal |
|---|---|---|
| G-001 | Make AI usable from Steam Deck Game Mode | User can launch, navigate, chat, and manage sessions using controller only |
| G-002 | Provide secure Electron architecture | Renderer has no Node access and all privileged operations go through typed IPC |
| G-003 | Support local-first workflows | App works offline for sessions, memory, settings, and local model management |
| G-004 | Enable extensibility | Hermes/Lua extension commands can be installed, listed, trusted, run, and diagnosed |
| G-005 | Feel premium and native | UI matches Tactical Glass design system and performs within Steam Deck budgets |
| G-006 | Be buildable by AI agents | Requirements are ID-tagged, testable, and traceable |

### 5.2 Business/Product Success Metrics

| Metric ID | Metric | Target |
|---|---|---:|
| M-001 | Cold launch to interactive shell on Steam Deck | ≤ 5 seconds target, ≤ 8 seconds max |
| M-002 | Controller-only completion of first prompt | 100% supported |
| M-003 | Critical screen readability at 1280×800 | 100% pass |
| M-004 | Renderer security baseline | 100% pass |
| M-005 | Crash-free basic session | ≥ 99% in QA runs |
| M-006 | Offline session access | 100% supported |
| M-007 | v1.0 release gate pass rate | 100% blocking gates pass |

---

## 6. Scope

### 6.1 v1.0 In Scope

#### Core App

- Electron app shell
- Custom frameless title bar
- React renderer
- Tailwind theme system
- Secure preload bridge
- Typed IPC contracts
- Local configuration
- Local session persistence
- Local memory store
- Diagnostics dashboard
- Settings system
- Error recovery screen

#### AI Workspace

- Chat workspace
- Prompt input console
- Streaming response UI
- Model selection
- Provider adapter abstraction
- Local model provider support through configurable command/service adapters
- Remote provider support through secure API key storage
- Persona selection
- Agent selection
- Session browser
- Export/import basic sessions

#### Steam Deck

- Game Mode-friendly launcher
- AppImage packaging path
- Controller navigation
- Focus graph
- 1280×800 layout rules
- Touchscreen fallback
- Docked display support
- Suspend/resume handling

#### Hermes / Lua Extensions

- Extension registry screen
- Install/uninstall local extension packages
- Trust/untrust extension
- Run extension command through main-process allowlist
- Diagnostics for extension health
- File-based and CLI bridge support

#### Security

- Renderer isolation
- No Node in renderer
- ContextBridge preload API only
- Validated IPC payloads
- Secret redaction
- Safe local filesystem access
- Plugin/extension permission model
- Local HTTP binds to loopback only if enabled

#### QA

- Unit tests
- IPC tests
- Security tests
- Playwright E2E
- Steam Deck manual QA checklist
- Packaging smoke tests

### 6.2 v1.0 Out of Scope

- Cloud sync
- Public plugin marketplace
- Multi-user accounts
- Enterprise authentication
- Voice assistant
- Mobile companion app
- Built-in model training/fine-tuning
- Remote desktop streaming
- Full IDE/code editor
- Steam Store publishing
- Native Decky Loader plugin
- Kernel/system-level integrations
- Arbitrary shell command execution from renderer

### 6.3 v1.1 Candidate Scope

- Plugin marketplace prototype
- Advanced agent orchestration
- Local vector database improvements
- Voice input
- Rich prompt library
- Theme editor
- Better model installer UX
- Update manager
- Steam artwork/capsule automation

### 6.4 v2.0 Candidate Scope

- NeuroDeck Cloud
- Multi-device sync
- Collaborative sessions
- Full project-aware coding workspace
- Remote agent execution
- Mobile companion
- Steam Store-ready release path

---

## 7. Product Principles

### 7.1 Controller-First

Every critical action must be reachable with Steam Deck controls. Keyboard and touchscreen are enhancements, not requirements.

### 7.2 Offline-First

The app must remain useful without internet access. Offline mode must support launching, viewing sessions, viewing memory, editing settings where applicable, and using local models if configured.

### 7.3 Secure by Default

The renderer is untrusted. Plugins are untrusted until explicitly trusted. Secrets never enter UI runtime as raw values unless absolutely unavoidable, and raw secret display is never default.

### 7.4 Native-Feeling Electron

NEURODECK is Electron, but it must not feel like a lazy browser wrapper. It must behave like a focused desktop product with crisp controls, fast launch, strong keyboard/gamepad support, and stable window behavior.

### 7.5 No Hidden Magic

When a model, extension, provider, or service fails, the app must explain what failed and how to fix it. No silent failure, no fake success states.

---

## 8. User Journeys

### UJ-001: First Launch on Steam Deck

1. User launches NEURODECK from Game Mode.
2. Boot screen appears.
3. App detects Steam Deck environment.
4. User completes onboarding.
5. User selects local model profile or remote provider.
6. User reaches Workspace.
7. User sends first prompt using controller or keyboard.

**Success Criteria:** User can complete the journey without leaving Game Mode except when installing external dependencies.

### UJ-002: Continue a Previous AI Session

1. User opens Session Browser.
2. User selects a previous session.
3. Workspace restores messages, persona, model, and memory references.
4. User continues conversation.

**Success Criteria:** Session state is preserved after app restart and Steam Deck suspend/resume.

### UJ-003: Configure a Model Provider

1. User opens Models.
2. User selects provider type.
3. User enters configuration.
4. If remote provider requires secret, app stores it securely.
5. User tests provider.
6. Provider becomes selectable in Workspace.

**Success Criteria:** Invalid provider config returns actionable diagnostics.

### UJ-004: Run a Hermes Extension

1. User opens Hermes Extensions.
2. User installs or discovers local extension.
3. User reviews permissions.
4. User trusts extension.
5. User runs an extension command.
6. Output appears as a structured result card.

**Success Criteria:** Untrusted extensions cannot run privileged commands.

### UJ-005: Recover From Broken Local Model

1. User sends prompt.
2. Local model process fails.
3. Workspace renders error card.
4. User can retry, switch model, open diagnostics, or save session.

**Success Criteria:** No crash, no lost prompt, no blank screen.

---

## 9. Epics and Functional Requirements

Requirement levels:

- **MUST:** Required for v1.0
- **SHOULD:** Strongly recommended for v1.0 unless schedule risk is high
- **MAY:** Optional

---

### Epic ND-APP: App Shell and Lifecycle

#### ND-APP-001 — App launches from installed package

**Priority:** MUST  
**Requirement:** NEURODECK must launch from packaged builds on SteamOS, Windows, Linux, and macOS.  
**Acceptance Criteria:**

- App launches from SteamOS Desktop Mode.
- App launches from Steam Deck Game Mode as a non-Steam app shortcut.
- App launches from Windows Start/Menu shortcut.
- App launches without requiring terminal commands.
- If configuration is missing, app opens onboarding instead of crashing.

#### ND-APP-002 — Frameless custom window shell

**Priority:** MUST  
**Requirement:** Desktop builds must use a custom frameless title bar that supports drag regions and window controls.  
**Acceptance Criteria:**

- Header drag region works on desktop platforms.
- Minimize, maximize, close controls work where platform-appropriate.
- Steam Deck Game Mode can run borderless/fullscreen mode.
- Window controls are keyboard and controller reachable.

#### ND-APP-003 — Startup recovery

**Priority:** MUST  
**Requirement:** App must detect failed previous startup and offer safe mode.  
**Acceptance Criteria:**

- If app crashed during prior launch, safe mode is offered.
- Safe mode disables plugins/extensions and optional animations.
- User can open diagnostics from safe mode.

#### ND-APP-004 — Global command palette

**Priority:** SHOULD  
**Requirement:** App must provide a command palette for quick navigation and actions.  
**Acceptance Criteria:**

- Openable by keyboard shortcut.
- Openable by controller mapping.
- Supports fuzzy search.
- Commands respect permission state.

---

### Epic ND-WKS: AI Workspace

#### ND-WKS-001 — Send prompt

**Priority:** MUST  
**Requirement:** User must be able to send a prompt to the selected model from Workspace.  
**Acceptance Criteria:**

- Prompt can be typed using keyboard, virtual keyboard, or touchscreen.
- Prompt can be submitted via controller action.
- Prompt remains visible if submission fails.
- Empty prompt submission is blocked.
- Request creates a session message record.

#### ND-WKS-002 — Stream response

**Priority:** MUST  
**Requirement:** Model responses should stream into the response card when provider supports streaming.  
**Acceptance Criteria:**

- Streaming tokens update without layout jump.
- User can cancel generation.
- Partial response is saved with canceled status.
- Errors render inside response card.

#### ND-WKS-003 — Non-streaming response fallback

**Priority:** MUST  
**Requirement:** Providers that do not support streaming must return complete responses gracefully.  
**Acceptance Criteria:**

- Loading state appears.
- Full response appears when complete.
- Timeout displays recoverable error.

#### ND-WKS-004 — Conversation context

**Priority:** MUST  
**Requirement:** App must maintain conversation context for active session.  
**Acceptance Criteria:**

- Recent messages are included based on model/provider limits.
- User can clear context without deleting session.
- Context overflow is handled with summarization or truncation warning.

#### ND-WKS-005 — Regenerate response

**Priority:** SHOULD  
**Requirement:** User can regenerate the last assistant response.  
**Acceptance Criteria:**

- Original response is preserved unless user explicitly replaces it.
- Regeneration uses same prompt context by default.
- Controller mapping supports regenerate.

---

### Epic ND-MDL: Model Management

#### ND-MDL-001 — Model provider registry

**Priority:** MUST  
**Requirement:** App must maintain a typed registry of model providers.  
**Provider Types:**

- Local command provider
- Local HTTP provider
- Remote API provider
- Mock provider for tests only, never production default

**Acceptance Criteria:**

- Provider metadata is stored locally.
- Provider secrets are not stored in plain config.
- Invalid provider config is rejected.

#### ND-MDL-002 — Local model profiles

**Priority:** MUST  
**Requirement:** App must support local model profiles for Steam Deck-friendly usage.  
**Acceptance Criteria:**

- User can add local model endpoint/command.
- User can test connection.
- User can mark provider as default.
- App explains when local runtime is missing.

#### ND-MDL-003 — Remote model provider setup

**Priority:** SHOULD  
**Requirement:** App should support remote model providers using secure key storage.  
**Acceptance Criteria:**

- Raw API key is write-only in UI after entry.
- UI displays key status, not key value.
- Renderer never receives raw key after storage.

#### ND-MDL-004 — Model failure handling

**Priority:** MUST  
**Requirement:** Provider failures must be recoverable.  
**Acceptance Criteria:**

- App shows error category.
- User can retry.
- User can open diagnostics.
- Session remains intact.

---

### Epic ND-SES: Sessions

#### ND-SES-001 — Create session

**Priority:** MUST  
**Requirement:** App creates a new session when user starts a new chat or explicitly creates one.  
**Acceptance Criteria:**

- Session has ID, title, timestamps, model, persona, messages.
- Empty sessions can be auto-cleaned with user consent.

#### ND-SES-002 — Session browser

**Priority:** MUST  
**Requirement:** User can browse, search, open, rename, archive, and delete sessions.  
**Acceptance Criteria:**

- Search works offline.
- Deletion requires confirmation.
- Archived sessions are hidden by default but recoverable.

#### ND-SES-003 — Session export

**Priority:** SHOULD  
**Requirement:** User can export sessions.  
**Acceptance Criteria:**

- Markdown export supported.
- JSON export supported.
- Export excludes secrets.

#### ND-SES-004 — Session persistence

**Priority:** MUST  
**Requirement:** Sessions persist across app restart and suspend/resume.  
**Acceptance Criteria:**

- In-progress prompt is restored if possible.
- Corrupt session data triggers repair flow.

---

### Epic ND-PRS: Personas

#### ND-PRS-001 — Built-in personas

**Priority:** MUST  
**Requirement:** App ships with built-in personas.  
**Minimum Personas:**

- Developer
- Architect
- Security Analyst
- Researcher
- Writer
- Educator

**Acceptance Criteria:**

- User can switch persona from Workspace.
- Persona change affects subsequent prompts.
- Persona state is saved to session.

#### ND-PRS-002 — Custom persona

**Priority:** SHOULD  
**Requirement:** User can create custom persona presets.  
**Acceptance Criteria:**

- Name, description, instruction, and safety notes are editable.
- Custom persona can be deleted.
- Invalid or empty persona is rejected.

---

### Epic ND-AGT: Agents

#### ND-AGT-001 — Agent registry

**Priority:** MUST  
**Requirement:** App provides an agent registry for built-in task modes.  
**Minimum Agents:**

- Coding Agent
- Testing Agent
- Security Agent
- Documentation Agent
- Refactoring Agent

**Acceptance Criteria:**

- User can select agent from Workspace or Agents screen.
- Agent shows capabilities and limitations.
- Agent cannot run tools without declared permission.

#### ND-AGT-002 — Agent task execution

**Priority:** SHOULD  
**Requirement:** User can run agent tasks that produce structured outputs.  
**Acceptance Criteria:**

- Task cards show status.
- Failures are recoverable.
- Tool usage is visible.

---

### Epic ND-MEM: Memory and Context

#### ND-MEM-001 — Local memory store

**Priority:** MUST  
**Requirement:** App must store local memory/context items.  
**Acceptance Criteria:**

- User can add memory item.
- User can edit memory item.
- User can delete memory item.
- Memory is searchable offline.

#### ND-MEM-002 — Memory visibility

**Priority:** MUST  
**Requirement:** User must be able to inspect what memory/context is attached to a session.  
**Acceptance Criteria:**

- Context panel shows active memory.
- User can detach memory from session.
- App never silently attaches sensitive memory without visual indication.

#### ND-MEM-003 — Memory safety

**Priority:** MUST  
**Requirement:** Memory system must avoid accidental secret leakage.  
**Acceptance Criteria:**

- Secret-like values are flagged.
- User must confirm storing secret-like data.
- Export warns before including memory.

---

### Epic ND-HRM: Hermes/Lua Extensions

#### ND-HRM-001 — Extension registry

**Priority:** MUST  
**Requirement:** App must display installed Hermes/Lua extensions.  
**Acceptance Criteria:**

- Shows extension name, version, trust state, permissions, commands.
- Broken extension manifests are shown as invalid, not loaded.

#### ND-HRM-002 — Extension install from local package

**Priority:** MUST  
**Requirement:** User can install an extension from a local folder or ZIP.  
**Acceptance Criteria:**

- Manifest is validated.
- Files are copied to extension directory.
- Extension is untrusted by default.
- User must explicitly trust before privileged execution.

#### ND-HRM-003 — Extension command execution

**Priority:** MUST  
**Requirement:** Trusted extensions can run declared commands through main-process service.  
**Acceptance Criteria:**

- Renderer cannot call arbitrary Lua script path.
- Command must be declared in manifest.
- Command args are validated.
- Output is structured and logged.

#### ND-HRM-004 — Extension permissions

**Priority:** MUST  
**Requirement:** Extensions declare permissions before execution.  
**Permissions:**

- filesystem.none/project/hermes/full
- shell.false/true
- network.false/true
- env.false/true
- secrets.false/true

**Acceptance Criteria:**

- Permission prompt appears before trust.
- Permission changes require re-trust.
- Dangerous permissions are visually flagged.

#### ND-HRM-005 — Extension diagnostics

**Priority:** MUST  
**Requirement:** App can diagnose extension health.  
**Acceptance Criteria:**

- Detects missing files.
- Detects invalid manifests.
- Detects denied permissions.
- Detects Lua runtime missing.

---

### Epic ND-SET: Settings

#### ND-SET-001 — Settings framework

**Priority:** MUST  
**Requirement:** App must expose settings for app, appearance, models, privacy, Deck behavior, plugins, and diagnostics.  
**Acceptance Criteria:**

- Settings are searchable.
- Settings changes persist.
- Risky settings show confirmation.

#### ND-SET-002 — Secrets settings

**Priority:** MUST  
**Requirement:** Secrets are managed in a dedicated secure settings section.  
**Acceptance Criteria:**

- Raw secrets are write-only by default.
- User can remove secret.
- User can test provider without revealing secret.

#### ND-SET-003 — Reset settings

**Priority:** MUST  
**Requirement:** User can reset settings safely.  
**Acceptance Criteria:**

- User can reset UI settings only.
- User can reset provider settings only.
- Full reset requires explicit confirmation.

---

### Epic ND-DIAG: Diagnostics

#### ND-DIAG-001 — Diagnostics dashboard

**Priority:** MUST  
**Requirement:** App must provide diagnostics for runtime, model providers, extension health, storage, performance, and security baseline.  
**Acceptance Criteria:**

- Diagnostics screen shows pass/warn/fail states.
- User can copy diagnostic report.
- Report redacts secrets.

#### ND-DIAG-002 — Logs

**Priority:** MUST  
**Requirement:** App must log important lifecycle, provider, plugin, and error events.  
**Acceptance Criteria:**

- Logs rotate.
- Logs redact secrets.
- Logs can be exported.
- Logs are local by default.

#### ND-DIAG-003 — Crash recovery

**Priority:** MUST  
**Requirement:** App must recover from crashes gracefully.  
**Acceptance Criteria:**

- Crash marker is written.
- Next launch offers safe mode.
- User can view crash summary.

---

### Epic ND-DSN: Design System and UI

#### ND-DSN-001 — Tactical Glass theme

**Priority:** MUST  
**Requirement:** App must implement Tactical Glass as default theme.  
**Acceptance Criteria:**

- Uses semantic CSS variables.
- Works at 1280×800.
- Meets contrast requirements.
- Avoids GPU-heavy blur/shader effects.

#### ND-DSN-002 — Theme variants

**Priority:** SHOULD  
**Requirement:** App should ship theme variants.  
**Themes:**

- Blacksite
- Tactical Glass
- Ghost Terminal
- Hologrid
- Minimal Ops
- Night Watch
- Broadcast
- High Contrast

#### ND-DSN-003 — Component library

**Priority:** MUST  
**Requirement:** App must implement reusable React components.  
**Minimum Components:**

- Button
- Input
- Textarea
- Select
- Modal
- Command Palette
- Sidebar
- Tabs
- Toast
- Status Card
- Response Card
- Token Stream
- Model Card
- Agent Card
- Session Card
- Memory Item
- Diagnostics Badge

---

### Epic ND-CTL: Controller and Input

#### ND-CTL-001 — Controller focus graph

**Priority:** MUST  
**Requirement:** App must maintain deterministic controller focus movement.  
**Acceptance Criteria:**

- All interactive controls are reachable.
- Focus traps are prohibited unless modal is active.
- Escape/back always has a predictable action.

#### ND-CTL-002 — Critical actions controller reachable

**Priority:** MUST  
**Requirement:** Every critical action must be reachable without keyboard/mouse.  
**Critical Actions:**

- Send prompt
- Open command palette
- Switch session
- Switch model
- Open settings
- Open diagnostics
- Save/export session
- Cancel generation

#### ND-CTL-003 — Virtual keyboard support

**Priority:** MUST  
**Requirement:** Text input must work with Steam Deck virtual keyboard.  
**Acceptance Criteria:**

- Focused input opens virtual keyboard where supported.
- UI remains visible above keyboard when possible.
- Text fields preserve content on keyboard close.

---

### Epic ND-PKG: Packaging and Release

#### ND-PKG-001 — Steam Deck AppImage

**Priority:** MUST  
**Requirement:** Steam Deck build must produce AppImage or equivalent SteamOS-friendly package.  
**Acceptance Criteria:**

- AppImage launches in Desktop Mode.
- AppImage can be added as non-Steam app.
- Launcher uses stable app data path.

#### ND-PKG-002 — Desktop installers

**Priority:** MUST  
**Requirement:** App must build desktop packages.  
**Targets:**

- Windows NSIS or portable build
- Linux AppImage
- macOS DMG/ZIP

#### ND-PKG-003 — Release checksum

**Priority:** MUST  
**Requirement:** Releases must include checksum files.  
**Acceptance Criteria:**

- SHA256 checksum generated for each artifact.
- Checksum published next to release.

---

## 10. Non-Functional Requirements

### 10.1 Performance Requirements

| ID | Requirement | Target |
|---|---|---:|
| ND-NFR-PERF-001 | Cold launch to interactive shell | ≤ 5s target, ≤ 8s max |
| ND-NFR-PERF-002 | Workspace input latency | ≤ 50ms perceived |
| ND-NFR-PERF-003 | UI frame budget | 60 FPS target, no sustained jank |
| ND-NFR-PERF-004 | Chat list virtualization | Required for sessions over 100 messages |
| ND-NFR-PERF-005 | Memory usage app shell | ≤ 350MB target excluding external model runtime |
| ND-NFR-PERF-006 | Startup heavy service loading | Lazy-load after shell is interactive |

### 10.2 Reliability Requirements

| ID | Requirement |
|---|---|
| ND-NFR-REL-001 | App must not lose saved sessions after crash |
| ND-NFR-REL-002 | App must recover from corrupt config with safe defaults |
| ND-NFR-REL-003 | Provider failure must not crash renderer |
| ND-NFR-REL-004 | Extension failure must not crash app shell |
| ND-NFR-REL-005 | Suspend/resume must preserve session state |

### 10.3 Offline Requirements

| ID | Requirement |
|---|---|
| ND-NFR-OFF-001 | App launches offline |
| ND-NFR-OFF-002 | Sessions are readable offline |
| ND-NFR-OFF-003 | Memory is searchable offline |
| ND-NFR-OFF-004 | Local model providers can run offline when configured |
| ND-NFR-OFF-005 | Remote providers show offline status gracefully |

---

## 11. Electron Architecture Requirements

### 11.1 Required Stack

- Electron
- TypeScript
- React
- Vite or Electron Vite
- Tailwind CSS
- Lucide React
- Zod for validation
- Zustand or Redux Toolkit for state
- Vitest for unit tests
- Playwright for E2E tests
- Electron Forge or electron-builder for packaging

### 11.2 Process Model

NEURODECK must use a strict Electron process split:

```txt
Electron Main
  App lifecycle
  Window creation
  IPC handlers
  Filesystem access
  Model process orchestration
  Extension execution
  Secrets service
  Diagnostics service

Preload
  contextBridge API only
  Typed API facade
  No business logic beyond safe bridging

Renderer
  React UI
  Routing
  State presentation
  Controller focus
  No direct Node.js access
```

Electron’s official model separates main and renderer processes, and NEURODECK must follow that split rather than giving the UI direct privileged access. Electron’s preload guidance also supports exposing limited privileged APIs into the renderer through a preload bridge. See official Electron Process Model, Preload, and Security references in Appendix A.

### 11.3 BrowserWindow Baseline

All production BrowserWindow instances must follow this baseline:

```ts
webPreferences: {
  preload: PRELOAD_PATH,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
}
```

### 11.4 Renderer Restrictions

Renderer must never directly access:

- `fs`
- `child_process`
- `shell`
- native database bindings
- raw secrets
- arbitrary plugin code
- arbitrary Lua file paths
- unrestricted network endpoints

### 11.5 Main Process Services

| Service | Responsibility |
|---|---|
| `windowService` | BrowserWindow lifecycle |
| `settingsService` | app config read/write |
| `secretsService` | secure key storage and retrieval |
| `modelService` | provider registry and generation orchestration |
| `sessionService` | session persistence and export |
| `memoryService` | memory/context storage |
| `agentService` | agent registry and task execution |
| `pluginService` | extension registry and permission checks |
| `hermesService` | Hermes/Lua command execution |
| `diagnosticsService` | health checks and reports |
| `steamDeckService` | Deck detection and Game Mode config |
| `logService` | redacted logging and export |

---

## 12. IPC Contract Requirements

### 12.1 IPC Rules

All IPC must be:

- Named consistently
- Typed
- Validated with schema
- Allowlisted
- Logged without secrets
- Tested
- One purpose per channel

### 12.2 IPC Naming Format

```txt
domain:action
```

Examples:

```txt
app:getVersion
settings:get
model:list
model:sendPrompt
session:create
hermes:runCommand
plugin:trust
security:getSecretStatus
```

### 12.3 Required IPC Channel Registry

| Channel | Direction | Payload | Return | Security Level |
|---|---|---|---|---|
| `app:getVersion` | renderer → main | none | version info | Low |
| `app:getRuntimeInfo` | renderer → main | none | OS/Deck/runtime info | Low |
| `settings:get` | renderer → main | settings key | setting value | Medium |
| `settings:set` | renderer → main | key/value | result | Medium |
| `security:setSecret` | renderer → main | secret ID/value | status | High |
| `security:getSecretStatus` | renderer → main | secret ID | exists/metadata only | High |
| `model:list` | renderer → main | filter | providers/models | Medium |
| `model:testProvider` | renderer → main | provider ID | test result | High |
| `model:sendPrompt` | renderer → main | session/model/prompt | stream/result handle | High |
| `model:cancel` | renderer → main | generation ID | result | Medium |
| `session:list` | renderer → main | query | sessions | Medium |
| `session:open` | renderer → main | session ID | session | Medium |
| `session:create` | renderer → main | metadata | session | Medium |
| `session:update` | renderer → main | session patch | result | Medium |
| `session:delete` | renderer → main | session ID | result | Medium |
| `session:export` | renderer → main | session/export type | file/result | High |
| `memory:list` | renderer → main | query | memory items | Medium |
| `memory:create` | renderer → main | memory draft | result | Medium |
| `memory:update` | renderer → main | patch | result | Medium |
| `memory:delete` | renderer → main | memory ID | result | Medium |
| `agent:list` | renderer → main | none | agents | Medium |
| `agent:runTask` | renderer → main | agent/task payload | task result | High |
| `plugin:list` | renderer → main | none | plugins | Medium |
| `plugin:installLocal` | renderer → main | file/folder ref | result | High |
| `plugin:trust` | renderer → main | plugin ID | result | High |
| `plugin:untrust` | renderer → main | plugin ID | result | High |
| `hermes:listCommands` | renderer → main | extension ID | commands | Medium |
| `hermes:runCommand` | renderer → main | extension/command/args | result | High |
| `diagnostics:run` | renderer → main | scope | report | Medium |
| `logs:export` | renderer → main | scope | file path/result | High |

### 12.4 Forbidden IPC Channels

The following must not exist in production:

```txt
shell:exec
fs:readAny
fs:writeAny
plugin:runRaw
lua:runFile
secrets:getRaw
debug:eval
window:openRemoteUnchecked
```

### 12.5 Stream Events

Model generation should use evented streaming:

```txt
model:generationStarted
model:generationDelta
model:generationCompleted
model:generationFailed
model:generationCanceled
```

Payloads must include generation ID and session ID.

---

## 13. Data and Storage Requirements

### 13.1 App Data Directory

NEURODECK must use platform-appropriate app data directories.

Required logical structure:

```txt
neurodeck-data/
  config/
  sessions/
  memory/
  models/
  plugins/
  hermes/
  logs/
  cache/
  exports/
  crash/
```

### 13.2 Config Storage

Config must be versioned and migratable.

```json
{
  "schemaVersion": 1,
  "app": {},
  "appearance": {},
  "models": {},
  "privacy": {},
  "steamDeck": {},
  "plugins": {}
}
```

### 13.3 Session Schema

```json
{
  "id": "session_...",
  "title": "string",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "modelProviderId": "string",
  "personaId": "string",
  "agentId": "string|null",
  "messages": [],
  "memoryRefs": [],
  "metadata": {}
}
```

### 13.4 Memory Schema

```json
{
  "id": "mem_...",
  "title": "string",
  "body": "string",
  "tags": [],
  "sensitivity": "normal|private|secret_like",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### 13.5 Database Recommendation

For v1.0, either approach is acceptable:

1. SQLite through main process only
2. Versioned JSON files with atomic writes

If SQLite is used, renderer must not load native DB bindings directly.

---

## 14. Security and Privacy Requirements

### 14.1 Security Baseline

| ID | Requirement |
|---|---|
| ND-SEC-001 | Renderer must have `nodeIntegration: false` |
| ND-SEC-002 | Renderer must have `contextIsolation: true` |
| ND-SEC-003 | Renderer must use sandboxing where compatible |
| ND-SEC-004 | Preload exposes only typed safe APIs |
| ND-SEC-005 | All IPC payloads are schema-validated |
| ND-SEC-006 | Raw secrets are never returned to renderer after storage |
| ND-SEC-007 | Logs redact secrets |
| ND-SEC-008 | Extensions are untrusted by default |
| ND-SEC-009 | Dangerous extension permissions require explicit confirmation |
| ND-SEC-010 | Remote content is blocked by default |
| ND-SEC-011 | Local HTTP services bind to 127.0.0.1 only unless explicitly overridden |
| ND-SEC-012 | No arbitrary shell execution from renderer |

### 14.2 Secret Handling

Secrets include:

- API keys
- tokens
- passwords
- cookies
- auth headers
- private keys
- OAuth refresh tokens

Rules:

- Secrets are stored by `secretsService` only.
- Renderer can set a secret but cannot read it back raw.
- UI displays status: configured/missing/invalid.
- Export excludes secrets.
- Logs redact secret-like values.

### 14.3 Content Security Policy

Production renderer must use strict CSP.

Baseline:

```txt
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: file:;
connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*;
font-src 'self';
object-src 'none';
base-uri 'none';
frame-src 'none';
```

Remote model APIs may be added through explicit provider-specific allowlists.

### 14.4 Threat Model Summary

| Threat | Mitigation |
|---|---|
| Malicious plugin | Trust gate, permission manifest, command allowlist |
| XSS in renderer | CSP, sanitized markdown, no Node access |
| Secret exposure | main-only secret service, redaction, no raw readback |
| Arbitrary shell execution | no shell IPC, extension permission gating |
| Remote content compromise | remote content blocked by default |
| Corrupt config | schema validation, safe mode, migrations |
| Model command abuse | provider command allowlist and arg validation |

### 14.5 Privacy Requirements

- No telemetry is sent externally by default.
- Diagnostics are local by default.
- User controls exports.
- Crash reports are local unless explicit sharing is added later.
- Logs must show warning before export.

---

## 15. Steam Deck Requirements

### 15.1 Game Mode Launch

NEURODECK must support Steam Deck Game Mode by packaging as a non-Steam app-friendly executable/AppImage and providing a stable launcher target.

Valve’s public Steam Deck Desktop FAQ confirms desktop-installed apps can be added to Steam and then appear in Deck UI under non-Steam apps. NEURODECK must align with this flow rather than modifying Steam internals.

### 15.2 Required Deck Behaviors

| ID | Requirement |
|---|---|
| ND-DECK-001 | Launch from Game Mode |
| ND-DECK-002 | Launch from Desktop Mode |
| ND-DECK-003 | Fit 1280×800 without horizontal scroll |
| ND-DECK-004 | Controller-only navigation for critical path |
| ND-DECK-005 | Touchscreen usable as fallback |
| ND-DECK-006 | Virtual keyboard works with prompt input |
| ND-DECK-007 | Suspend/resume does not corrupt state |
| ND-DECK-008 | Docked 1080p layout works |
| ND-DECK-009 | Text readable at handheld distance |
| ND-DECK-010 | App handles offline network state |

### 15.3 Controller Mapping Baseline

| Control | Action |
|---|---|
| A | Select / Submit focused action |
| B | Back / Close modal |
| X | Open command palette or secondary action |
| Y | Context action |
| L1/R1 | Switch panels/tabs |
| L2/R2 | Scroll / page controls |
| L4 | Persona quick switch |
| R4 | Regenerate response |
| L5 | Save/export session |
| R5 | New session |
| Start/Menu | Open app menu |
| Select/View | Open diagnostics or HUD |

### 15.4 Steam Deck Performance Budget

| Area | Target |
|---|---:|
| Shell launch | ≤ 5s target |
| UI memory excluding model runtime | ≤ 350MB target |
| Animations | transform/opacity preferred |
| Blur | limited/fake-depth preferred |
| Chat rendering | virtualized over 100 messages |
| Disk writes | debounced/atomic |

---

## 16. Accessibility Requirements

### 16.1 Accessibility Targets

NEURODECK must target WCAG AA as a hard minimum and WCAG AAA where practical.

### 16.2 Required Accessibility Modes

- High Contrast
- Reduced Motion
- Colorblind-safe themes
- Low Vision scale
- Dyslexia-friendly typography option
- Controller-only mode
- Keyboard-only mode

### 16.3 Required Accessibility Criteria

| ID | Requirement |
|---|---|
| ND-A11Y-001 | All interactive controls must be keyboard reachable |
| ND-A11Y-002 | All critical controls must be controller reachable |
| ND-A11Y-003 | Focus state must be visible |
| ND-A11Y-004 | Reduced motion disables nonessential animation |
| ND-A11Y-005 | Text contrast meets AA minimum |
| ND-A11Y-006 | Critical text should target AAA contrast where possible |
| ND-A11Y-007 | No information conveyed by color alone |
| ND-A11Y-008 | Screen reader labels exist for core controls |

---

## 17. Design System Requirements

### 17.1 Tactical Glass Design Language

Tactical Glass is the canonical NEURODECK visual direction.

Design DNA:

- 70% modern tactical OS
- 20% AAA game HUD
- 10% retro terminal heritage

### 17.2 Token Requirements

Required token categories:

- Color
- Typography
- Spacing
- Radius
- Border
- Surface
- Elevation
- Motion
- Focus
- State
- Breakpoints
- Z-index

### 17.3 Required Token Files

```txt
src/renderer/styles/tokens.css
src/renderer/styles/themes/tactical-glass.css
src/renderer/styles/themes/blacksite.css
src/renderer/styles/themes/high-contrast.css
tailwind.config.ts
src/renderer/design-system/components.json
```

### 17.4 Screen Catalog

Each screen must define:

- Purpose
- User goal
- Layout
- Components
- States
- Empty states
- Loading states
- Error states
- Controller navigation
- Keyboard navigation
- IPC/API calls
- Telemetry/logging
- Test cases

Required screens:

- Boot
- Onboarding
- Workspace
- Models
- Agents
- Memory
- Sessions
- Hermes Extensions
- Plugin Manager
- Settings
- Security & Privacy
- Diagnostics
- Error Recovery
- About/Release Notes

---

## 18. Telemetry, Logging, and Diagnostics

### 18.1 Telemetry Policy

For v1.0, telemetry is local-only unless the user explicitly opts in later.

### 18.2 Required Local Events

| Event | Purpose |
|---|---|
| `app.started` | Startup diagnostics |
| `app.ready` | Launch timing |
| `model.prompt.started` | Provider health |
| `model.prompt.completed` | Latency and success |
| `model.prompt.failed` | Error tracking |
| `session.created` | Session lifecycle |
| `extension.installed` | Extension lifecycle |
| `extension.command.failed` | Extension diagnostics |
| `security.secret.updated` | Secret status, no value |
| `diagnostics.report.generated` | Support flow |

### 18.3 Redaction Rules

Logs must redact values matching these labels/patterns:

```txt
API_KEY
TOKEN
SECRET
PASSWORD
PRIVATE_KEY
AUTHORIZATION
COOKIE
BEARER
SESSION
```

---

## 19. Error Handling Requirements

### 19.1 Error Shape

All app errors should conform to:

```ts
type NeurodeckError = {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'fatal';
  recoverable: boolean;
  userAction?: string;
  details?: unknown;
};
```

### 19.2 Required Error Categories

- App startup
- Config validation
- Storage failure
- Provider failure
- Network failure
- Model timeout
- Extension failure
- IPC validation failure
- Permission denied
- Export failure
- Update failure

### 19.3 User-Facing Rule

Every error shown to the user must answer:

1. What happened?
2. Did my data survive?
3. What can I do next?

---

## 20. QA and Test Plan

### 20.1 Test Types

| Test Type | Tooling | Required |
|---|---|---:|
| Unit | Vitest | Yes |
| React component | Testing Library | Yes |
| IPC integration | Vitest/custom harness | Yes |
| E2E | Playwright | Yes |
| Security | custom checks/electronegativity-style audit optional | Yes |
| Packaging smoke | script/manual | Yes |
| Steam Deck manual | checklist | Yes |

### 20.2 Required Test Matrix

#### Resolutions

- 1280×800
- 1280×720
- 1920×1080
- 2560×1440

#### Inputs

- Steam Deck built-in controls
- Xbox controller
- DualSense controller
- Keyboard
- Mouse
- Touchscreen

#### Platforms

- Steam Deck LCD
- Steam Deck OLED
- Desktop Linux
- Windows 11
- macOS

### 20.3 Blocking QA Gates

A release cannot ship if any of these fail:

- App does not launch
- Renderer has Node integration enabled
- Raw secrets are exposed in renderer
- Game Mode launch fails
- Workspace prompt flow fails
- Session persistence fails
- Controller critical path fails
- Security diagnostics fail
- Package checksum missing
- App crashes on offline launch

---

## 21. Release Criteria

### 21.1 Pre-Alpha Exit Criteria

- App shell launches
- Workspace screen renders
- Basic IPC works
- Settings persist
- One provider stub works in dev only
- Initial Tactical Glass theme present

### 21.2 Alpha Exit Criteria

- Prompt flow works with at least one real provider
- Sessions persist
- Controller navigation works on primary screens
- Diagnostics screen exists
- Hermes extension registry exists
- Security baseline tests pass

### 21.3 Beta Exit Criteria

- Steam Deck AppImage launches from Game Mode
- All v1.0 must-have screens implemented
- QA matrix mostly passes
- Crash recovery works
- Plugin trust flow works
- Export works
- Accessibility checks pass minimum AA

### 21.4 v1.0 Release Criteria

- 100% MUST requirements pass
- 0 critical security issues
- 0 blocking Game Mode issues
- 0 data loss bugs
- 0 known renderer privilege leaks
- All release artifacts generated with checksums
- Installation guide complete
- Known issues documented

---

## 22. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Electron feels bloated on Deck | High | Lazy loading, strict animation rules, memory budgets |
| Controller UX breaks in nested panels | High | Formal focus graph and QA checklist |
| Local model setup is too hard | High | Provider diagnostics, profiles, clear setup guides |
| Plugins create security risk | High | Trust gates, permission manifests, no raw execution |
| Steam Game Mode quirks | Medium | AppImage smoke tests, non-Steam shortcut guide |
| Secret leakage | High | main-only secret service, redacted logs, IPC tests |
| Scope creep | High | v1.0 non-goals enforced |
| AI agents overbuild | Medium | Requirement IDs and traceability matrix |

---

## 23. Implementation Backlog

### Sprint 0 — Foundation

- Create Electron/React/TypeScript repo
- Add Tailwind and base tokens
- Add main/preload/renderer split
- Add secure BrowserWindow defaults
- Add IPC schema validation
- Add logger with redaction
- Add settings service
- Add app shell routes

### Sprint 1 — Workspace MVP

- Workspace layout
- Prompt input
- Response cards
- Provider registry
- One real provider adapter
- Session creation
- Session persistence
- Basic error cards

### Sprint 2 — Steam Deck UX

- Controller focus system
- Game Mode layout pass
- 1280×800 QA
- Virtual keyboard behavior
- Steam Deck runtime detection
- AppImage launcher script

### Sprint 3 — Models, Sessions, Memory

- Models screen
- Session browser
- Memory screen
- Search
- Export
- Provider diagnostics

### Sprint 4 — Agents and Hermes

- Agent registry
- Agent cards
- Hermes extension registry
- Local extension install
- Trust/permission flow
- Run extension command safely

### Sprint 5 — Security and Diagnostics

- Secrets service
- Security settings
- Diagnostics dashboard
- Log export
- Crash recovery
- IPC security tests

### Sprint 6 — Packaging and Release

- Windows package
- Linux AppImage
- macOS build
- Steam Deck smoke testing
- Release checklist
- Docs and known issues

---

## 24. Requirements Traceability Matrix Summary

A separate CSV is included in the production package. The minimum traceability rule is:

```txt
Requirement → Screen/Service → IPC/API → Test → Release Gate
```

No MUST requirement is considered complete until it has:

- Acceptance criteria
- Owning screen/service
- Test type
- Release gate mapping

---

## 25. AI Builder Implementation Instructions

Use this prompt with Claude, Gemini, Kimi, Cursor, or another coding agent:

```md
You are a senior Electron architect, React engineer, Steam Deck UX designer, and application security reviewer.

Build NEURODECK according to `NEURODECK_Canonical_Production_PRD_v1.0.md`.

Rules:

1. Use Electron + React + TypeScript + Tailwind CSS.
2. Use strict main/preload/renderer separation.
3. Renderer must not have Node.js access.
4. Use contextBridge APIs only.
5. All IPC channels must be typed, allowlisted, and schema-validated.
6. Do not create arbitrary shell execution APIs.
7. Do not expose raw secrets to the renderer.
8. Implement Steam Deck 1280×800 layout first.
9. Implement controller navigation for all critical flows.
10. Use Tactical Glass design tokens.
11. Implement sessions, models, personas, agents, memory, settings, diagnostics, and Hermes extension registry.
12. Build from requirements IDs.
13. Write tests for every MUST requirement.
14. Do not use placeholder-only production flows.
15. Mock providers are allowed only in tests and development fixtures.
16. Include packaging scripts for Linux AppImage and Windows.
17. Include release checklist and checksum generation.

Before coding each feature, map it to requirement IDs and acceptance criteria.
After coding, update the traceability matrix.
```

---

## 26. Open Questions

| ID | Question | Owner | Needed Before |
|---|---|---|---|
| OQ-001 | Which first real model provider ships in v1.0? | Product/Engineering | Sprint 1 |
| OQ-002 | SQLite or JSON storage for v1.0? | Engineering | Sprint 0 |
| OQ-003 | Which packager: Electron Forge or electron-builder? | Engineering | Sprint 0 |
| OQ-004 | Will remote providers be included in v1.0 or local-only first? | Product | Sprint 1 |
| OQ-005 | Should Hermes extensions run through bundled Lua or system Lua? | Engineering | Sprint 4 |
| OQ-006 | Is macOS notarization required for v1.0? | Release | Sprint 6 |
| OQ-007 | Is auto-update included or deferred to v1.1? | Product | Sprint 6 |

---

## 27. Glossary

| Term | Meaning |
|---|---|
| Game Mode | Steam Deck console-like UI mode |
| Desktop Mode | Steam Deck KDE/Linux desktop mode |
| Renderer | Electron web UI process |
| Main Process | Electron privileged application process |
| Preload | Secure bridge script between main and renderer |
| IPC | Inter-process communication between renderer and main |
| Hermes | Project Lua extension/automation layer |
| Tactical Glass | NEURODECK visual design language |
| Provider | AI model source such as local runtime or remote API |
| Persona | Instruction preset affecting AI behavior |
| Agent | Task-oriented AI workflow mode |
| Memory | Local saved context items |

---

## Appendix A — References

- Electron Process Model: https://electronjs.org/docs/latest/tutorial/process-model
- Electron Preload Scripts: https://electronjs.org/docs/latest/tutorial/tutorial-preload
- Electron Security Tutorial: https://electronjs.org/docs/latest/tutorial/security
- Steam Deck Desktop FAQ / Non-Steam app flow: https://help.steampowered.com/en/faqs/view/671A-4453-E8D2-323C

---

## Appendix B — v1.0 Definition of Done

NEURODECK v1.0 is done when:

- All MUST requirements pass.
- User can launch from Steam Deck Game Mode.
- User can send a prompt and receive response.
- User can save, reopen, and export sessions.
- User can configure at least one real provider.
- User can use controller-only critical navigation.
- User can inspect diagnostics.
- User can install and trust a Hermes extension.
- Renderer has no Node access.
- Secrets are not exposed.
- Logs redact sensitive values.
- Packaging artifacts exist with checksums.
- Steam Deck release checklist passes.

No vibes-only shipping. If it cannot be tested, it is not done.
