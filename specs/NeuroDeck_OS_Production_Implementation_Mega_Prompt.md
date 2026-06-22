# NEURODECK OS / NDX HARNESS

## Supreme Production Implementation Mega-Prompt

### Electron + React + TypeScript + Tailwind + Controller-Native AI Runtime

> Use this prompt with Claude Code, Gemini CLI, Kimi Code, Codex, Cursor, or another repository-aware coding agent.
>
> Attach or place `NeuroDeck_OS_Controller_Wireframe_Spec.md` in the repository before execution. That document is the authoritative screen, controller, focus, state, and interaction specification.

---

# MASTER INSTRUCTION

You are the principal software architect, senior Electron engineer, controller UX specialist, AI systems engineer, security engineer, accessibility engineer, performance engineer, and test lead responsible for implementing **NeuroDeck OS / NDX Harness** as a production-grade, controller-native AI operating layer for Steam Deck.

This is not a concept exercise, UI mockup, throwaway prototype, partial scaffold, or MVP. You must inspect the existing repository, determine what is real, preserve correct production code, repair or replace broken architecture, and implement the complete system in a controlled sequence.

The resulting application must be:

- Fully usable with the Steam Deck controller
- Functional without a mouse, touchscreen, or external keyboard
- Built on Electron, React, TypeScript, and Tailwind CSS
- Securely separated between renderer, Electron main process, and local core services
- Connected to real filesystem, process, terminal, Git, model, workflow, and system integrations
- Free of mocked production data and fake runtime status
- Auditable, permissioned, cancellable, recoverable, and testable
- Stable at 1280 × 800
- Responsive when docked at 1920 × 1080 and 2560 × 1440
- Packaged for SteamOS and launchable from Steam Game Mode
- Implemented with deterministic controller focus and navigation
- Verified through automated tests and repository-native validation

Do not merely write a plan. Create the plan, execute it, test it, repair failures, and leave the repository in a production-ready state.

---

# 1. SOURCE-OF-TRUTH ORDER

Use this precedence order whenever requirements conflict:

1. Security, data integrity, user control, and recoverability
2. `NeuroDeck_OS_Controller_Wireframe_Spec.md`
3. Existing production behavior proven by tests and real integrations
4. Existing repository architecture and coding standards
5. Existing visual design tokens that align with the wireframe specification
6. This implementation prompt
7. Agent assumptions

Never silently override a higher-priority source.

When a conflict is discovered:

1. Record it.
2. Explain the impact in the implementation ledger.
3. Choose the safest production-compatible resolution.
4. Update code, tests, and documentation together.
5. Do not preserve obsolete behavior merely because it already exists.

---

# 2. ABSOLUTE NON-NEGOTIABLES

## 2.1 No mock production behavior

Do not ship:

- Fake CPU, GPU, memory, battery, thermal, storage, network, VPN, Git, model, agent, workflow, or task data
- Hard-coded success responses
- Simulated terminal output
- Fake provider connectivity
- Decorative process lists
- Static file trees presented as live files
- Placeholder browser tabs presented as real sessions
- Fake download progress
- Fake update status
- Fake controller connection state
- Fake workflow execution
- Stubbed IPC handlers returning canned objects
- In-memory-only substitutes for required persistence
- Buttons that display success without performing the action
- “Coming soon” controls inside required production workflows
- Dead navigation routes
- Empty feature shells masquerading as complete screens

Test fixtures and isolated mocks are allowed only inside test code. They must never leak into production bundles or runtime feature paths.

## 2.2 No unrestricted renderer privileges

The renderer must never receive:

- Node integration
- Unrestricted filesystem access
- Unrestricted process execution
- Raw secret-store access
- Direct database mutation privileges
- Arbitrary IPC channel access
- Direct shell execution
- Unsanitized operating-system events

Use a hardened preload bridge with narrowly scoped, typed APIs.

## 2.3 No controller cheating

A feature is incomplete if any required path depends on:

- Mouse hover
- Right-click without a controller equivalent
- Drag-and-drop without a controller alternative
- Tiny pointer targets
- Touchscreen-only gestures
- External keyboard entry
- Browser-native tab order that has not been validated spatially
- Hidden controls exposed only on pointer movement
- Focus that disappears after an update
- Unreachable modal actions
- Undocumented button combinations

Trackpad and touchscreen support may exist as optional accelerators. They cannot be required.

## 2.4 No unreviewed destructive AI execution

Natural-language input must never directly trigger destructive operations.

All meaningful AI actions must flow through:

```text
Intent
→ Structured plan
→ Policy evaluation
→ Permission evaluation
→ User review when required
→ Typed tool invocation
→ Validation
→ Audit
→ Recovery checkpoint
```

## 2.5 No false completion claims

Do not mark any screen, feature, or story complete until:

- The route exists.
- The UI renders real state.
- Controller traversal passes.
- Empty/loading/error/offline/restricted states exist where applicable.
- Typed IPC is connected where system access is required.
- Unit or integration tests exist.
- End-to-end coverage exists for the primary workflow.
- Build and type checks pass.
- No critical console or runtime errors remain.
- The completion ledger contains evidence.

---

# 3. OPERATING MODE

Work autonomously and make evidence-based decisions.

Do not repeatedly ask for confirmation when the repository and specification provide enough information. When information is missing, choose the safest reversible implementation, record the assumption, and continue.

Do not stop after analysis. Continue through implementation and verification.

Do not mass-rewrite working code without reason. Preserve correct code and improve surgically.

Do not optimize for the smallest diff if the existing architecture is unsafe or fundamentally incompatible. Optimize for correct, maintainable production behavior.

Use repository-native tools first:

- Existing package manager
- Existing build scripts
- Existing linting and formatting
- Existing test framework
- Existing LSP configuration
- Existing CI workflows
- Existing design tokens
- Existing code generation conventions

Use available language servers and semantic tools for:

- Symbol discovery
- Reference analysis
- Type-aware refactoring
- Import repair
- Dead-code detection
- Call hierarchy inspection
- Rename operations
- Error validation

If Serena, Fallow, or equivalent repository-aware tools are available, use them for semantic inspection and validation. Never use tool availability as an excuse to invent results.

---

# 4. FIRST-PASS REPOSITORY DISCOVERY

Before changing code, inspect the repository deeply.

## 4.1 Identify

- Package manager and lockfile
- Electron version
- React version
- TypeScript configuration
- Tailwind configuration
- Bundler and packaging stack
- Main process entry points
- Preload scripts
- Renderer roots
- Routing architecture
- State-management architecture
- IPC implementation
- Database/storage implementation
- Existing local services
- Controller/gamepad support
- Focus-management code
- Terminal implementation
- File service
- Git service
- Browser/webview strategy
- Model provider integrations
- Agent or workflow code
- Logging and diagnostics
- Test frameworks
- Playwright configuration
- CI/CD
- SteamOS packaging
- Security settings
- Accessibility support
- Known TODOs, stubs, mocks, and dead code

## 4.2 Search explicitly for danger patterns

Search for:

```text
mock
fake
stub
placeholder
TODO
FIXME
coming soon
setTimeout
Math.random
sampleData
demoData
hardcoded
ipcRenderer
nodeIntegration
contextIsolation
webSecurity
shell.exec
child_process
eval
new Function
dangerouslySetInnerHTML
any
@ts-ignore
eslint-disable
catch {}
console.log
localStorage
sessionStorage
```

Classify every finding as:

- Legitimate test fixture
- Intentional development-only behavior
- Production defect
- Security risk
- Dead code
- Documentation-only reference

Do not delete blindly. Trace usages first.

## 4.3 Produce an implementation ledger

Create or update:

```text
docs/implementation/NDX_IMPLEMENTATION_LEDGER.md
```

The ledger must contain:

- Repository baseline
- Architecture findings
- Security findings
- Controller findings
- Mock/stub inventory
- Screen inventory status
- IPC inventory
- Test inventory
- Work sequence
- Decisions and assumptions
- Completed items with evidence
- Remaining risks
- Deferred items with explicit reason

This ledger must stay current throughout implementation.

---

# 5. TARGET ARCHITECTURE

Implement or evolve toward:

```text
Electron Renderer
    ↓
Typed, frozen preload API
    ↓
Electron Main Process
    ↓
Authenticated local RPC / service boundary
    ↓
NDX Core
    ├── Action and Tool Registry
    ├── Permission Broker
    ├── Model Router
    ├── Agent Runtime
    ├── Workflow Runtime
    ├── Workspace Service
    ├── File Service
    ├── Terminal Service
    ├── Git Service
    ├── Browser Session Service
    ├── Remote Systems Service
    ├── System Metrics Service
    ├── Recovery Service
    ├── Notification Service
    ├── Audit Service
    └── Settings Service
```

The core may initially live in TypeScript/Node if that matches the repository and can be isolated safely. Performance-critical or security-sensitive services may be implemented in Rust where justified. Do not introduce a second language merely for prestige.

## 5.1 Process boundaries

### Renderer

Responsible for:

- Presentation
- Focus state
- Controller UX
- View-level state
- Optimistic UI where safe
- User input
- Accessibility
- Rendering execution progress

Not responsible for:

- Direct filesystem access
- Shell execution
- Secret retrieval
- Database ownership
- OS metrics collection
- Privilege elevation
- Arbitrary HTTP provider credentials

### Preload

Responsible for:

- Narrow typed bridge
- Input validation at boundary
- Event subscription lifecycle
- No business logic
- No dynamic channel names from the renderer
- No raw `ipcRenderer` exposure

### Main process

Responsible for:

- Window lifecycle
- Protocol handling
- Permission requests
- Secure BrowserWindow/WebContents configuration
- IPC routing
- Native integration
- Core-service lifecycle
- Crash recovery
- Update orchestration

### Core service

Responsible for:

- Real tools and integrations
- Long-running tasks
- Policy evaluation
- Audit
- Persistence
- Cancellation
- Recovery
- Resource management

---

# 6. ELECTRON SECURITY BASELINE

Every production BrowserWindow must use:

```ts
{
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false
}
```

Additionally:

- Disable or strictly constrain navigation.
- Deny unknown popup creation.
- Validate every external URL.
- Open external links through an allowlisted handler.
- Use a custom application protocol rather than unsafe `file://` patterns where appropriate.
- Apply a strict Content Security Policy.
- Never disable certificate validation.
- Never expose raw filesystem paths without need.
- Never expose stack traces containing secrets to the renderer.
- Validate all IPC payloads with a runtime schema system such as Zod.
- Return normalized typed errors.
- Implement request IDs, cancellation, and timeouts.
- Rate-limit abuse-prone operations.
- Redact secrets from logs.
- Treat terminal, browser, remote host, and model output as untrusted content.
- Protect against prompt injection crossing into tool authorization.
- Separate provider response text from trusted action schemas.
- Maintain an audit record for sensitive actions.

Create an explicit security document:

```text
docs/security/NDX_SECURITY_ARCHITECTURE.md
```

---

# 7. PROJECT STRUCTURE

Adapt to the repository, but converge toward clear feature and boundary ownership.

```text
src/
├── app/
│   ├── bootstrap/
│   ├── routing/
│   ├── shell/
│   ├── providers/
│   └── error-boundaries/
├── controller/
│   ├── adapters/
│   ├── focus/
│   ├── mappings/
│   ├── haptics/
│   ├── profiles/
│   └── testing/
├── features/
│   ├── onboarding/
│   ├── home/
│   ├── command-palette/
│   ├── activity/
│   ├── ai-canvas/
│   ├── approvals/
│   ├── agents/
│   ├── workspaces/
│   ├── build-studio/
│   ├── git/
│   ├── files/
│   ├── terminal/
│   ├── browser/
│   ├── workflows/
│   ├── models/
│   ├── learning/
│   ├── remote/
│   ├── recovery/
│   └── system/
├── components/
│   ├── primitives/
│   ├── focus/
│   ├── navigation/
│   ├── overlays/
│   ├── forms/
│   ├── data-display/
│   ├── feedback/
│   └── accessibility/
├── state/
├── services/
│   ├── ipc/
│   ├── queries/
│   ├── events/
│   └── validation/
├── shared/
│   ├── contracts/
│   ├── schemas/
│   ├── errors/
│   ├── constants/
│   └── types/
├── main/
│   ├── windows/
│   ├── ipc/
│   ├── security/
│   ├── protocols/
│   ├── lifecycle/
│   └── core-client/
├── preload/
└── core/
    ├── actions/
    ├── permissions/
    ├── models/
    ├── agents/
    ├── workflows/
    ├── workspaces/
    ├── files/
    ├── terminal/
    ├── git/
    ├── browser/
    ├── remote/
    ├── system/
    ├── recovery/
    ├── audit/
    └── persistence/
```

Avoid giant generic utility folders. Code ownership must be obvious.

---

# 8. DESIGN SYSTEM IMPLEMENTATION

Implement the wireframe design system as reusable tokens and primitives.

## 8.1 Tokens

At minimum:

- Colors
- Text hierarchy
- Surfaces
- Borders
- Focus visuals
- Status colors
- Spacing
- Radius
- Shadow/elevation
- Motion
- Z-index
- Target sizes
- Breakpoints
- Docked density
- Reduced-motion variants
- High-contrast variants

Do not scatter literal color values throughout components.

## 8.2 Core primitives

Implement tested primitives before duplicating patterns:

- `FocusSurface`
- `ControllerButton`
- `ActionRail`
- `SystemRail`
- `NavigationRail`
- `ContextPanel`
- `ControllerHint`
- `FocusList`
- `FocusGrid`
- `FocusTree`
- `PaneGroup`
- `Modal`
- `ConfirmationDialog`
- `CriticalConfirmationDialog`
- `PermissionDialog`
- `CommandPalette`
- `RadialActionMenu`
- `Toast`
- `StatusBadge`
- `ProgressTimeline`
- `EmptyState`
- `ErrorState`
- `OfflineState`
- `RestrictedState`
- `VirtualizedFocusList`
- `PredictiveInput`
- `SecureInput`
- `DiffViewer`
- `LogViewer`
- `MetricCard`
- `TaskCard`
- `WorkspaceCard`
- `AgentCard`
- `ModelCard`
- `WorkflowCard`

## 8.3 Visual constraints

- Optimize for 1280 × 800.
- Use 16 px minimum body text.
- Use 14 px only for secondary metadata.
- Maintain 48 × 48 px minimum focus targets.
- Prefer solid surfaces over excessive glass effects.
- Use ultraviolet accents sparingly.
- Avoid neon clutter.
- Avoid CRT effects.
- Avoid low-contrast transparent panels.
- Never let animation shift layout around the focused item.
- Respect reduced motion.
- All status states need text/icon reinforcement, not color alone.

---

# 9. CONTROLLER INPUT RUNTIME

Implement a centralized controller subsystem.

## 9.1 Adapter layer

Support:

- Steam Deck built-in controls
- Xbox-compatible controllers
- DualSense
- Generic Gamepad API devices
- Keyboard fallback for development
- Optional Steam Input integration
- Optional SDL/native adapter if required for reliable rear-button access

Normalize input into semantic actions:

```ts
type ControllerAction =
  | 'confirm'
  | 'back'
  | 'context'
  | 'assist'
  | 'nav.up'
  | 'nav.down'
  | 'nav.left'
  | 'nav.right'
  | 'tab.previous'
  | 'tab.next'
  | 'pane.previous'
  | 'pane.next'
  | 'pin'
  | 'inspect'
  | 'activity'
  | 'commands'
  | 'voice'
  | 'keyboard'
  | 'ai.actions'
  | 'execute'
  | 'home'
  | 'workspace.switcher'
  | 'emergency.stop'
```

Do not bind feature code directly to raw gamepad button indices.

## 9.2 Requirements

- Device connect/disconnect handling
- Active-controller detection
- Debouncing
- Repeat delay and rate
- Analog dead zones
- Hold detection
- Chord detection
- Per-controller profiles
- Per-feature profiles
- Input conflict resolution
- Configurable haptics
- Accessibility overrides
- Test-mode event injection
- Controller glyph adaptation

## 9.3 Input priority

Use a clear active-input policy so pointer movement does not unexpectedly steal controller focus. Switching between controller, keyboard, touch, and pointer must be deliberate and visible where necessary.

---

# 10. SPATIAL FOCUS ENGINE

Do not depend solely on DOM tab order.

Implement:

- Explicit focus graph support
- Geometry-assisted fallback
- Focus groups
- Pane memory
- Route memory
- Modal trapping
- Virtualized-list focus
- Scroll-follow behavior
- Dynamic-node recovery
- Disabled/hidden skipping
- Initial target registration
- Deterministic directional movement
- Focus restoration to invoker
- Focus debugging overlay
- Automated focus graph inspection

## 10.1 Focus registry

Each node must register:

```ts
interface FocusNodeRegistration {
  id: string
  groupId: string
  role: FocusRole
  element: HTMLElement
  disabled: boolean
  hidden: boolean
  priority: number
  explicitNeighbors?: Partial<Record<Direction, string>>
  fallbackId?: string
  onActivate(): void
  onContext?(): void
  onAssist?(): void
}
```

## 10.2 Deterministic navigation

Direction selection should evaluate:

1. Explicit neighbor
2. Valid node in the same focus group
3. Geometric candidate in requested direction
4. Group-level transition
5. Registered fallback
6. Last known valid focus
7. Screen initial focus

Never drop focus to `document.body`.

## 10.3 Focus developer tools

Create a development-only overlay showing:

- Current focused node
- Group
- Neighbors
- Bounding box
- Input action
- Focus history
- Missing initial targets
- Unreachable nodes
- Duplicate IDs
- Invalid explicit edges

This is required for debugging and automated screenshots.

---

# 11. ROUTING AND SHELL

Implement all routes defined in the wireframe specification.

Each route must declare:

- Route ID
- Screen ID
- Title
- Required capability
- Initial focus target
- Loading state
- Error boundary
- Controller hint map
- Available global actions
- Restoration behavior

The shell must include:

- Top System Rail
- Primary Navigation Rail
- Active View
- Optional Context Panel
- Bottom Controller Action Rail
- Global Command Palette
- Activity Center
- Notification Center
- Workspace Switcher
- Quick Access Overlay
- Power Menu
- Emergency Stop Overlay

State must survive route changes and workspace switches where expected.

---

# 12. IMPLEMENT ALL 56 SCREENS

Implement every screen listed in `NeuroDeck_OS_Controller_Wireframe_Spec.md`.

Do not merge screens merely to reduce implementation effort unless the resulting route still preserves all specified workflows and distinct states.

For every screen:

1. Create the route or overlay.
2. Implement its layout.
3. Implement controller focus.
4. Wire real state.
5. Add controller hints.
6. Add loading state.
7. Add empty state.
8. Add error state.
9. Add offline state where relevant.
10. Add restricted state where relevant.
11. Add accessibility semantics.
12. Add unit/component tests.
13. Add controller traversal tests.
14. Add primary E2E flow.
15. Add the screen to the implementation ledger.

The required screen IDs are:

```text
ND-001 Boot and Session Start
ND-002 Lock Screen
ND-003 First-Run Welcome
ND-004 Controller Calibration
ND-005 AI Provider Setup
ND-006 Workspace Discovery
ND-007 Guided Controller Tutorial
ND-008 Home Command Center
ND-009 Universal Command Palette
ND-010 Global Search
ND-011 Activity Center
ND-012 Notification Center
ND-013 AI Command Canvas
ND-014 AI Execution Timeline
ND-015 Approval Queue
ND-016 Agent Operations Center
ND-017 Agent Detail
ND-018 Workspace Hub
ND-019 Workspace Detail
ND-020 Workspace Switcher
ND-021 Build Studio
ND-022 Code Editor
ND-023 Symbol Navigator
ND-024 Diagnostics and Problems
ND-025 Git Control Center
ND-026 File Manager
ND-027 File Preview
ND-028 Universal Terminal
ND-029 Command Builder
ND-030 Browser Hub
ND-031 Browser View
ND-032 Workflow Library
ND-033 Workflow Forge
ND-034 Workflow Run Detail
ND-035 Model Control Center
ND-036 Model Detail
ND-037 Routing Profiles
ND-038 Learning Hub
ND-039 Guided Lab
ND-040 Remote Systems
ND-041 Remote Session
ND-042 System Dashboard
ND-043 Controller Settings
ND-044 Display and Theme Settings
ND-045 Network and VPN
ND-046 Privacy and Permissions
ND-047 Storage and Recovery
ND-048 Integrations
ND-049 Updates
ND-050 Quick Access Overlay
ND-051 Power Menu
ND-052 Recovery Timeline
ND-053 Before/After Diff
ND-054 Emergency Stop
ND-055 Error Recovery
ND-056 About and Diagnostics
```

---

# 13. REAL STATE AND PERSISTENCE

Use durable persistence for production state.

Recommended storage:

- SQLite for relational application state
- OS-backed secure storage for secrets
- Filesystem snapshots or Git for recoverable project changes
- Structured append-only audit events
- Migration system with rollback strategy

Persist at minimum:

- Workspaces
- Workspace UI resume state
- Controller profiles
- Provider metadata
- Secret references
- Agent definitions
- Agent runs
- Tool calls
- Approval decisions
- Workflows
- Workflow runs
- Model metadata
- Routing profiles
- Notifications
- Recovery points
- Settings
- Integration status
- Audit events

Do not store secrets in:

- Renderer state
- Redux/Zustand devtools
- localStorage
- plaintext JSON
- logs
- crash reports
- workflow exports

---

# 14. TYPED IPC AND CONTRACTS

Create shared runtime-validated schemas for every IPC domain:

```text
workspace.*
agent.*
model.*
tool.*
permission.*
workflow.*
terminal.*
file.*
git.*
browser.*
remote.*
system.*
controller.*
recovery.*
notification.*
settings.*
update.*
diagnostics.*
```

## 14.1 Required IPC characteristics

- Typed request
- Typed success response
- Typed error response
- Runtime validation
- Request ID
- Timeout
- Cancellation where applicable
- Permission metadata
- Audit metadata
- Streaming event support for long tasks
- Cleanup/unsubscribe support
- Versioned contract

## 14.2 Normalized errors

Use a structure similar to:

```ts
interface NdxError {
  code: string
  message: string
  userMessage: string
  category:
    | 'validation'
    | 'permission'
    | 'not-found'
    | 'conflict'
    | 'offline'
    | 'timeout'
    | 'provider'
    | 'system'
    | 'security'
    | 'unknown'
  retryable: boolean
  details?: Record<string, unknown>
  correlationId: string
}
```

Renderer-visible details must be sanitized.

---

# 15. AI COMMAND CANVAS AND ACTION SYSTEM

Implement AI interaction as structured operations, not raw chat-only behavior.

## 15.1 Plan schema

```ts
interface ActionPlan {
  id: string
  goal: string
  workspaceId?: string
  createdBy: 'user' | 'agent' | 'workflow'
  steps: ActionStep[]
  requiredPermissions: PermissionRequest[]
  risk: RiskLevel
  networkRequired: boolean
  estimatedImpact: ImpactSummary
  validationPlan: ValidationStep[]
  rollbackPlan?: RollbackPlan
  status: PlanStatus
}
```

## 15.2 Tool call schema

```ts
interface HarnessAction {
  id: string
  planId: string
  tool: string
  operation: string
  arguments: Record<string, unknown>
  scope: ResourceScope
  risk: RiskLevel
  requiresConfirmation: boolean
  reversible: boolean
  cancellationSupported: boolean
  rollbackAction?: Omit<HarnessAction, 'rollbackAction'>
}
```

## 15.3 Planner boundaries

The model may propose actions. It may not directly execute arbitrary commands.

Tool invocations must:

- Match a registered tool
- Pass schema validation
- Pass policy evaluation
- Pass permission evaluation
- Be bound to an approved scope
- Be recorded
- Support cancellation where possible
- Return structured results
- Trigger validation

## 15.4 Prompt injection resistance

Browser pages, files, terminal output, remote output, and retrieved content must be marked as untrusted context.

Never allow content to:

- Grant permissions
- Override system policy
- Change tool scope
- Request secrets
- Trigger execution by textual instruction alone

---

# 16. PERMISSION BROKER

Implement capabilities such as:

- `files.read`
- `files.write`
- `files.delete`
- `terminal.execute`
- `terminal.privileged`
- `network.request`
- `secrets.use`
- `git.commit`
- `git.push`
- `git.forcePush`
- `packages.install`
- `remote.connect`
- `remote.execute`
- `system.readMetrics`
- `system.changeSettings`
- `external.send`
- `browser.download`
- `browser.upload`

## 16.1 Scope

Permissions must support:

- Single action
- Current task
- Current workflow run
- Current workspace
- Current session
- Persistent policy

## 16.2 UI requirements

Every request must display:

- Requesting actor
- Capability
- Reason
- Scope
- Duration
- Risk
- Data destination where relevant
- Recovery support
- Safer alternative

Revocation must be possible from Privacy and Permissions.

---

# 17. AGENT RUNTIME

Agents must have:

- Stable ID
- Name
- Role
- Goal
- Workspace scope
- Model profile
- Tool allowlist
- Permission ceiling
- Resource limits
- Current state
- Event timeline
- Cancellation token
- Recovery checkpoint
- Final report

Agent states:

```text
idle
planning
waiting-for-approval
queued
running
paused
cancelling
cancelled
failed
completed
rolled-back
```

No hidden agents. Child agents must be visible and bounded.

The Agent Operations Center must stream real activity.

---

# 18. MODEL ROUTER

Support:

- Local OpenAI-compatible endpoints
- Configured cloud OpenAI-compatible endpoints
- Provider-specific adapters where required
- Coding models
- Vision models
- Speech-to-text
- Text-to-speech
- Embedding models

## 18.1 Routing factors

- Capability
- User profile
- Workspace privacy
- Online/offline state
- Battery state
- Memory pressure
- Thermal state
- Cost limit
- Context size
- Model availability
- Required tool support

## 18.2 Profiles

Implement:

- Balanced
- Local First
- Offline
- Battery Saver
- Maximum Quality
- Fast Coding
- Private Workspace
- Low Cost

Profiles must use real availability and measured resource data.

## 18.3 Provider setup

- Secure credential entry
- Real connection test
- Capability discovery
- Clear cloud-processing warning
- Provider disable/delete
- Usage visibility where provider data permits
- No secret exposure to renderer

---

# 19. WORKSPACE SERVICE

A workspace must encapsulate:

- Root folders
- Git repositories
- Open files
- Terminal sessions
- Browser sessions
- Active branch
- Model profile
- Agent permissions
- Environment references
- Recent actions
- UI resume state
- Controller shortcuts
- Recovery history

Implement:

- Discovery
- Creation
- Open
- Resume
- Archive
- Restore
- Export definition
- Import definition
- Folder permission boundaries
- Remote workspace references

Do not index sensitive directories without explicit user selection.

---

# 20. FILE SERVICE

Implement real:

- Listing
- Search
- Metadata
- Preview
- Read
- Write through approved operations
- Copy
- Move
- Rename
- Duplicate
- Compress
- Extract
- Trash
- Restore where supported
- Secure-delete capability detection
- Watch events
- Workspace boundaries

Security:

- Resolve and normalize paths.
- Prevent path traversal.
- Use allowlisted roots.
- Treat symbolic links carefully.
- Do not follow links outside an approved scope without new approval.
- Reject unsafe archive extraction.
- Stream large files.

---

# 21. TERMINAL SERVICE

Use a real PTY implementation suitable for SteamOS/Linux and supported desktop environments.

Implement:

- Local shells
- Multiple sessions
- Resize
- Streaming output
- Cancellation
- Exit status
- Working directory
- Workspace environment
- History
- Remote SSH terminals
- Search
- Copy selection
- Structured command proposals
- Command Builder
- Intent mode
- Secret redaction

Do not use `exec` for interactive terminal sessions.

Generated commands must be previewed and classified by risk.

Privileged commands require explicit approval.

---

# 22. GIT SERVICE

Use real Git operations through a safe adapter.

Implement:

- Repository discovery
- Status
- Diff
- Stage
- Unstage
- Commit
- Branch
- Checkout
- Fetch
- Pull
- Push
- Log
- Restore
- Stash
- Conflict detection
- Remote inspection

Rules:

- Commit and push are separate approvals.
- Force push is critical risk.
- Discard requires recovery support or explicit irreversibility warning.
- AI-generated commit messages must be editable.
- Branch name and target remote must be visible.

---

# 23. BUILD STUDIO

Integrate a production code editor suitable for Electron.

Potential choices:

- Monaco Editor
- CodeMirror 6 if better aligned with performance and controller UX

Implement:

- File tabs
- Split panes
- Syntax highlighting
- LSP integration
- Diagnostics
- Symbols
- Go to definition
- References
- Rename
- Formatting
- Code actions
- Completion
- Signature help
- Diff review
- Test integration
- Controller structural editing
- Predictive input
- Voice-to-code proposal
- Undo/redo
- Autosave policy
- External-change detection

AI edits must appear as diffs before application unless an explicitly trusted, low-risk policy applies.

---

# 24. BROWSER SYSTEM

Use a security-conscious browser architecture.

Determine whether the repository should use:

- BrowserView/WebContentsView
- Controlled embedded browser windows
- External system browser for unsupported cases

Avoid unsafe `<webview>` use unless strict isolation and lifecycle controls are implemented and justified.

Implement:

- Tabs
- Workspace grouping
- Session persistence
- Controller focus navigation
- Scroll
- Address/search input
- Reader mode where feasible
- Downloads
- Permission prompts
- Site profiles
- History
- Open externally
- Add page to workspace context
- AI summarization with privacy confirmation

Do not bypass site security or authentication controls.

---

# 25. WORKFLOW ENGINE

Implement a real workflow graph runtime.

Node types:

- Trigger
- Condition
- Tool action
- AI decision
- User approval
- Script
- Delay
- Parallel branch
- Merge
- Validator
- Output
- Rollback

Requirements:

- Versioned workflow definitions
- Schema validation
- Cycle detection
- Explicit loop limits
- Dry-run mode
- Permission preflight
- Checkpoints
- Cancellation
- Retry policy
- Timeout policy
- Structured logs
- Deterministic node state
- Resume after safe interruption
- Export/import
- Run history

AI decision nodes must return bounded structured outputs.

---

# 26. REMOTE SYSTEMS

Implement safe adapters for:

- SSH hosts
- Remote file browsing
- Remote commands
- Service status
- Logs
- Port-forward configuration where supported
- Remote desktop launcher integration where available

Security:

- Verify host identity.
- Store credential references securely.
- Display target hostname continuously.
- Require separate confirmation for destructive remote actions.
- Record destination and command.
- Allow clipboard restrictions.
- Support disconnect and emergency stop.

---

# 27. SYSTEM METRICS AND CONTROL

Collect real SteamOS/Linux metrics where permitted:

- CPU use
- GPU use
- RAM
- Swap
- Storage
- Battery
- Charge state
- Thermal sensors
- Fan information where exposed
- Network interfaces
- Process list
- User services
- Core-service health
- Model-runtime resource use

Use capability detection. Do not fabricate missing metrics.

Implement safe controls:

- Performance profile selection through supported interfaces
- Process termination with confirmation
- User-service restart
- Diagnostic export
- Safe cache cleanup with preview
- Log access
- Storage analysis

Unsupported capabilities must be labeled accurately.

---

# 28. NETWORK AND VPN

Implement management around real system capabilities.

Support where installed and available:

- Wi-Fi status
- Ethernet status
- DNS information
- Proxy configuration view
- Network diagnostics
- OpenVPN profile import
- WireGuard profile import
- NetworkManager integration
- Per-workspace policy where technically feasible
- Kill-switch configuration with explicit safety warnings

Do not claim universal provider support without a real adapter or standards-based configuration.

---

# 29. RECOVERY SYSTEM

Create recovery points for:

- File modifications
- Agent patches
- Workflow checkpoints
- Settings changes
- Package operations
- Updates
- System configuration changes where reversible

Use:

- Git snapshots/branches for repositories
- Atomic writes
- Backup copies with retention policy
- Transactional database changes
- Versioned settings
- Update rollback support

Every recovery event must declare:

- Fully reversible
- Partially reversible
- Manually recoverable
- Irreversible external effect

Implement ND-052 and ND-053 using real recovery metadata.

---

# 30. NOTIFICATIONS, AUDIT, AND OBSERVABILITY

Implement structured logging with:

- Timestamp
- Severity
- Domain
- Actor
- Workspace
- Correlation ID
- Action ID
- Redaction
- Error code

Create:

- User-visible Activity Center
- Notification Center
- Security audit view
- Diagnostic export
- Crash report preview
- Core-service health events

Never log:

- API keys
- Passwords
- Tokens
- Full secret environment values
- Private keys
- Sensitive clipboard contents

---

# 31. QUICK ACCESS AND STEAMOS INTEGRATION

Implement the practical integration permitted by SteamOS.

At minimum:

- Launch from Steam Game Mode
- Correct controller glyphs
- Fullscreen 1280 × 800 behavior
- Resume after suspend
- Controller reconnect recovery
- Steam shortcut metadata/documentation
- Safe return to SteamOS
- Power-menu impact summaries
- AppImage or supported Linux packaging

For Quick Access integration:

- Detect what is possible through available Decky/SteamOS integration.
- Keep the core app functional without Decky.
- Isolate optional plugin integration.
- Do not hard-crash when the plugin is absent.
- Use authenticated local communication.
- Document installation and permissions.

---

# 32. ACCESSIBILITY

Implement:

- Semantic labels
- Logical accessibility tree
- Visible focus
- High contrast
- Text scaling
- Reduced motion
- Haptic control
- Controller repeat control
- Hold-duration control
- Screen narration hooks
- Read-current-screen command
- Subtitle/caption support
- Single-hand mappings
- Remappable controls
- Status reinforcement beyond color
- Accessible error messages

Automated accessibility testing is required, but it does not replace manual controller and screen-reader checks.

---

# 33. PERFORMANCE ENGINEERING

Target:

- Controller input response below 50 ms
- Initial focus below 100 ms
- Normal route transition below 300 ms
- Warm quick overlay below 250 ms
- Shell idle CPU near or below 2% where practical
- Shell memory below 500 MB before heavy modules where practical

Implement:

- Route-level code splitting
- Lazy editor/browser loading
- Virtualized lists
- Bounded logs
- Event unsubscribe cleanup
- Suspended inactive browser tabs
- Throttled metrics
- Memoized focus geometry
- Worker threads or separate services for heavy tasks
- AbortController or equivalent cancellation
- Model unloading policies
- Background-animation pause
- Leak detection during tests

Measure before and after. Do not claim gains without evidence.

---

# 34. TEST STRATEGY

Use the repository’s existing frameworks where possible.

Required layers:

## 34.1 Unit tests

- Input normalization
- Chord/hold detection
- Focus candidate selection
- Focus recovery
- Permission evaluation
- Risk classification
- IPC schema validation
- Routing rules
- Workflow validation
- Path safety
- Error normalization
- Recovery metadata

## 34.2 Component tests

- Focusable primitives
- Modals
- Action rail
- Command palette
- Predictive input
- Permission cards
- Task cards
- Virtualized focus lists
- Diff viewer
- Error states

## 34.3 Integration tests

- Renderer → preload → main → core
- Real temporary filesystem
- Real temporary Git repository
- Real SQLite database
- PTY lifecycle
- Workflow execution
- Permission denial
- Cancellation
- Recovery
- Provider adapter contract tests

Use controlled local test environments. Do not require destructive access to the developer’s real files.

## 34.4 Playwright Electron E2E

Implement controller-action injection so tests operate through semantic controller commands rather than mouse clicks.

Cover:

- Boot
- Onboarding
- Home
- Navigation rail
- Command palette
- Workspace open/switch
- AI plan review
- Approval
- Activity
- Terminal command preview
- File open/preview
- Git diff
- Workflow dry-run
- Model selection
- Settings
- Recovery
- Emergency stop
- Exit to SteamOS behavior abstraction

## 34.5 Focus traversal tests

For every screen:

- Initial focus exists.
- All visible focusable nodes are reachable.
- No hidden node receives focus.
- No cycle traps block exit.
- Modal trap works.
- Back restores invoking focus.
- Dynamic removal recovers.
- Scroll follows.
- Resolution changes preserve valid focus.

Build a graph auditor that fails tests for unreachable nodes.

## 34.6 Visual regression

Capture at:

- 1280 × 800
- 1280 × 720
- 1920 × 1080
- 2560 × 1440

Include:

- Default
- Focused
- Modal
- Empty
- Loading
- Error
- Offline
- High contrast
- Reduced motion where visually relevant

## 34.7 Security tests

- IPC rejects malformed payloads.
- Renderer cannot invoke arbitrary channels.
- Path traversal is blocked.
- Unsafe URLs are blocked.
- Secrets are redacted.
- Permission ceilings hold.
- Tool output cannot grant permission.
- Untrusted web/file content cannot execute actions.
- Critical operations require confirmation.
- Cancelled requests stop at safe boundaries.

---

# 35. CONTROLLER QA MATRIX

Test with:

- Steam Deck built-in controls
- Xbox controller
- DualSense
- Generic XInput
- Controller disconnect during task
- Controller reconnect
- Rear buttons absent
- Haptics disabled
- High repeat rate
- Large dead zone
- Single-hand profile
- Docked mode
- Sleep/resume

A feature cannot be signed off solely using keyboard emulation.

---

# 36. BUILD, PACKAGING, AND CI

Implement or repair:

- Deterministic install
- Type check
- Lint
- Unit tests
- Integration tests
- Electron E2E
- Build
- Linux package
- Artifact checksums
- Release metadata
- Update-channel support
- Crash-safe startup
- Version display
- Build hash

CI must fail on:

- Type errors
- Lint errors
- Test failures
- Unreachable focus nodes
- Missing screen routes
- Missing IPC schemas
- Production mock imports
- Security configuration regressions
- Bundle secret scans
- Broken package generation

Create a Steam Deck installation guide:

```text
docs/deployment/STEAM_DECK_INSTALLATION.md
```

Include:

- Desktop Mode installation
- Permissions
- Game Mode shortcut setup
- Controller profile
- Optional Decky integration
- App update
- Logs
- Safe uninstall
- Recovery

---

# 37. IMPLEMENTATION EPICS

Execute in this order unless repository constraints demand a documented adjustment.

## Epic 0 — Baseline and safety

- Repository audit
- Ledger
- Build repair
- Test baseline
- Security baseline
- Mock/stub inventory
- Dead-code analysis

## Epic 1 — Shell and design system

- Tokens
- Primitives
- Shell
- Rails
- Modals
- Error boundaries
- Route registry
- Responsive 16:10 layout

## Epic 2 — Controller runtime

- Adapters
- Semantic actions
- Focus engine
- Haptics
- Profiles
- Debug overlay
- Traversal tests

## Epic 3 — Onboarding and global UX

- ND-001 through ND-012
- Command palette
- Search
- Activity
- Notifications
- Quick overlay foundation

## Epic 4 — AI safety runtime

- Plan schema
- Tool registry
- Permission broker
- Approval queue
- Execution timeline
- Emergency stop
- Audit

## Epic 5 — Workspaces and files

- Workspace persistence
- Discovery
- File service
- File manager
- Preview
- Recovery integration

## Epic 6 — Terminal and Git

- PTY
- Command Builder
- Intent proposals
- Git control center
- Diffs
- Git recovery branches

## Epic 7 — Build Studio

- Editor
- LSP
- Symbols
- Diagnostics
- Predictive editing
- Controller structural edits
- Tests

## Epic 8 — Agents and workflows

- Agent runtime
- Agent UI
- Workflow graph
- Workflow runtime
- Dry-run
- Checkpoints
- Run detail

## Epic 9 — Models

- Provider adapters
- Local runtime
- Routing profiles
- Resource-aware selection
- Model control center

## Epic 10 — Browser, remote, learning

- Browser hub/view
- Remote systems/session
- Learning hub
- Guided lab
- AI coach boundaries

## Epic 11 — System integration

- Metrics
- Controller settings
- Display/theme
- Network/VPN
- Privacy
- Storage
- Integrations
- Updates
- Diagnostics

## Epic 12 — Packaging and hardening

- SteamOS packaging
- Suspend/resume
- Controller reconnect
- Performance pass
- Security pass
- Accessibility pass
- Full E2E
- Release candidate

---

# 38. STORY COMPLETION TEMPLATE

For each story, record:

```markdown
## Story: <name>

### Requirement

<source requirement>

### Implementation

<files and architecture>

### Real integration

<system or service used>

### Controller behavior

<inputs, focus, back behavior>

### States

<loading, empty, error, offline, restricted>

### Security

<permissions and validation>

### Tests

<unit, integration, E2E, focus traversal>

### Evidence

<commands and results>

### Remaining risks

<none or explicit list>
```

---

# 39. REQUIRED VALIDATION COMMANDS

Discover the repository’s exact commands and document them. At minimum, execute equivalents of:

```bash
install
typecheck
lint
format-check
unit-tests
integration-tests
electron-e2e
focus-graph-audit
accessibility-tests
production-build
linux-package
```

Run targeted checks after each module and the full suite before final completion.

Do not “fix” tests by weakening assertions, skipping suites, or hiding errors.

---

# 40. FINAL ACCEPTANCE GATES

Do not declare the implementation complete until all applicable gates pass.

## Architecture

- Renderer is sandboxed.
- Preload API is narrow and typed.
- IPC is schema validated.
- Core operations are isolated.
- Secrets are protected.
- Migrations exist.
- Audit exists.

## Controller

- All 56 screens have initial focus.
- All primary workflows are controller-complete.
- No focus traps.
- Back behavior works.
- Controller disconnect/reconnect works.
- Controller hints are accurate.
- Predictive alternatives exist for required text entry.

## AI safety

- Plans are inspectable.
- Tools are typed.
- Permissions are scoped.
- Destructive actions require review.
- Emergency stop works.
- Cancellation works.
- Recovery metadata is accurate.
- Prompt injection cannot elevate tools.

## Functionality

- File operations are real.
- Terminal is real.
- Git is real.
- Model connections are real.
- Workflows execute real registered tools.
- System metrics are real or accurately unavailable.
- Browser sessions are real.
- Workspace state persists.
- Recovery restores verified state.

## UI

- 1280 × 800 is polished.
- Docked layouts work.
- Empty/loading/error/offline states exist.
- Text is readable.
- Focus is visible.
- No clipping.
- No overlapping.
- No inaccessible modal.
- No dead navigation.

## Quality

- Type check passes.
- Lint passes.
- Tests pass.
- Build passes.
- Package succeeds.
- No critical console errors.
- No production mocks.
- No known critical/high security defects.
- Documentation matches implementation.

---

# 41. FINAL OUTPUT FORMAT

When implementation work concludes, provide:

## 1. Executive summary

What was built, repaired, replaced, and verified.

## 2. Architecture summary

Final renderer/main/preload/core boundaries.

## 3. Screen completion matrix

All ND-001 through ND-056 with status and evidence.

## 4. Controller completion matrix

Primary route, initial focus, traversal test, and unresolved issue.

## 5. IPC inventory

Domains and key operations.

## 6. Real integration inventory

Filesystem, terminal, Git, models, system metrics, browser, remote, workflows, persistence.

## 7. Security report

Threats addressed, remaining risks, permission architecture.

## 8. Test report

Commands, counts, failures repaired, skipped tests with justification.

## 9. Performance report

Measured startup, navigation, memory, and overlay behavior.

## 10. Packaging report

Generated artifacts and Steam Deck installation path.

## 11. Remaining issues

Only verified unresolved work. Do not hide incomplete items.

## 12. File-change summary

Organized by feature and architecture layer.

---

# 42. FINAL AGENT DIRECTIVE

Begin by locating and reading:

```text
NeuroDeck_OS_Controller_Wireframe_Spec.md
```

Then:

1. Audit the repository.
2. Create the implementation ledger.
3. Establish a passing baseline or document existing failures.
4. Remove or isolate production mocks.
5. Harden Electron boundaries.
6. Implement the controller runtime and focus engine.
7. Implement the shell and all 56 screens.
8. Wire real services and persistence.
9. Implement AI plans, permissions, tools, cancellation, audit, and recovery.
10. Add comprehensive tests.
11. Validate every primary workflow at 1280 × 800.
12. Package for Steam Deck.
13. Run the full acceptance gates.
14. Report evidence honestly.

Do not stop at wireframes.
Do not stop at generated components.
Do not stop at a development-only demo.
Do not replace required functionality with placeholders.
Do not report success until the actual system passes its validation gates.

Build NeuroDeck OS as a real controller-native AI operating harness.
