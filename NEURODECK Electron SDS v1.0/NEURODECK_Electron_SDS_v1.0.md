# NEURODECK Electron Software Design Specification v1.0

**Project:** NEURODECK  
**Document Type:** Software Design Specification / SDS  
**Version:** 1.0  
**Status:** Production Build-Ready Draft  
**Primary Framework:** Electron + React + TypeScript + Tailwind CSS  
**Primary Device Target:** Steam Deck LCD/OLED, SteamOS Game Mode, SteamOS Desktop Mode  
**Secondary Targets:** Windows 11, desktop Linux, macOS  
**Generated:** 2026-06-09  
**Owner:** Khaotic Labs / NEURODECK  

---

## 0. Purpose

This SDS translates the **NEURODECK Canonical Production PRD v1.0** into concrete engineering architecture. The PRD defines what NEURODECK must do. This SDS defines how the Electron implementation must be structured, secured, wired, tested, and released.

The document is written for:

- Electron engineers
- React/TypeScript engineers
- AI coding agents
- QA engineers
- security reviewers
- release engineers
- Steam Deck packaging maintainers
- future plugin/extension authors

This is not a concept document. It is the technical contract for building the app without guessing.

---

## 1. System Overview

### 1.1 Product Implementation Summary

NEURODECK v1.0 is a secure Electron desktop application that presents a Steam Deck-first AI workstation experience. It uses Electron only as the native shell and operating-system bridge. The user-facing app is a React + TypeScript renderer styled with Tailwind CSS and NEURODECK design tokens.

The system is built around strict separation:

| Layer | Responsibility | Hard Rule |
|---|---|---|
| Electron Main | app lifecycle, windows, filesystem, subprocesses, updates, secrets, trusted services | never expose raw Node access to renderer |
| Preload | minimal typed bridge between renderer and main | only expose allowlisted APIs |
| Renderer | React UI, routing, state, presentation, controller UX | no direct filesystem, shell, or secret access |
| Local Services | model orchestration, memory indexing, plugin runtime, diagnostics | run behind main-owned service boundary |
| Hermes Lua Layer | trusted automation extension execution and app wiring | disabled/limited by permission model |
| Steam Deck Launcher | Game Mode entrypoint, runtime flags, resolution profile | no hidden system mutation |

### 1.2 Primary Architecture Pattern

NEURODECK follows a **secure desktop shell + typed local service gateway** pattern:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                              Steam Deck / OS                            │
│                                                                         │
│  ┌──────────────────────┐                                               │
│  │ Steam Game Mode      │                                               │
│  │ Non-Steam Shortcut   │                                               │
│  └──────────┬───────────┘                                               │
│             │                                                           │
│  ┌──────────▼───────────┐                                               │
│  │ NEURODECK Launcher   │                                               │
│  │ .desktop/AppImage    │                                               │
│  └──────────┬───────────┘                                               │
│             │                                                           │
│  ┌──────────▼────────────────────────────────────────────────────────┐   │
│  │ Electron Main Process                                             │   │
│  │ - App lifecycle                                                   │   │
│  │ - BrowserWindow                                                   │   │
│  │ - Secure IPC handlers                                             │   │
│  │ - Model subprocesses                                              │   │
│  │ - Secrets vault                                                   │   │
│  │ - Filesystem services                                             │   │
│  │ - Hermes runtime gateway                                          │   │
│  └──────────┬─────────────────────────────────────────────┬──────────┘   │
│             │                                             │              │
│  ┌──────────▼───────────┐                      ┌──────────▼───────────┐  │
│  │ Preload Bridge       │                      │ Local Services        │  │
│  │ contextBridge APIs   │                      │ Models/Memory/Plugins │  │
│  └──────────┬───────────┘                      └──────────┬───────────┘  │
│             │                                             │              │
│  ┌──────────▼─────────────────────────────────────────────▼──────────┐   │
│  │ React Renderer                                                    │   │
│  │ - Tactical Glass UI                                               │   │
│  │ - Controller focus graph                                          │   │
│  │ - Workspace                                                       │   │
│  │ - Models / Agents / Memory / Sessions / Settings                 │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Canonical Runtime Modes

| Mode | Description | Required Support |
|---|---|---|
| Steam Deck Game Mode | Non-Steam app launched from Steam Deck library | required |
| Steam Deck Desktop Mode | normal Linux desktop session | required |
| Docked Mode | Steam Deck attached to external display | required |
| Windows Desktop | packaged `.exe` installer or portable build | required for v1 desktop target |
| Linux Desktop | AppImage and unpacked dev build | required |
| macOS | signed/notarized later; local dev support for v1 | supported target, not first release gate |

---

## 2. Technology Stack

### 2.1 Required Stack

| Area | Technology | Requirement |
|---|---|---|
| Desktop shell | Electron | secure main/preload/renderer model |
| UI framework | React | functional components and hooks |
| Language | TypeScript | strict mode required |
| Styling | Tailwind CSS + CSS variables | token-driven design |
| Routing | TanStack Router or React Router | typed route registry preferred |
| App state | Zustand or Redux Toolkit | deterministic state boundaries |
| Server/cache state | TanStack Query | provider/model calls and async data |
| Validation | Zod | all IPC payloads and config schemas |
| Testing | Vitest, Playwright, Testing Library | unit, integration, E2E |
| Packaging | electron-builder or Electron Forge | Linux AppImage required |
| Logging | pino/electron-log style abstraction | redaction required |
| Secrets | OS keychain where available; encrypted local fallback | renderer never receives raw secrets except direct set flow |
| Extensions | Hermes Lua runtime gateway | permissioned and trusted |

### 2.2 Strict TypeScript Baseline

`tsconfig.json` must enforce:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "moduleResolution": "Bundler",
    "skipLibCheck": true
  }
}
```

No production code may use `any` unless documented with a justification comment and isolated at a boundary adapter.

---

## 3. Repository Structure

The app repository must separate Electron infrastructure, renderer UI, domain services, shared contracts, and packaging scripts.

```text
neurodeck/
  package.json
  pnpm-lock.yaml
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  electron-builder.yml
  README.md
  LICENSE
  CHANGELOG.md

  src/
    main/
      index.ts
      app/
        createApp.ts
        lifecycle.ts
        singleInstance.ts
        protocol.ts
      windows/
        mainWindow.ts
        splashWindow.ts
        diagnosticsWindow.ts
      ipc/
        registerIpcHandlers.ts
        ipcChannels.ts
        ipcSchemas.ts
        ipcErrors.ts
        ipcRateLimit.ts
      services/
        model/
          modelService.ts
          providerRegistry.ts
          localModelRunner.ts
          remoteProviderGateway.ts
        memory/
          memoryService.ts
          vectorIndexService.ts
          contextPackService.ts
        sessions/
          sessionService.ts
          transcriptStore.ts
        agents/
          agentService.ts
          personaService.ts
        plugins/
          pluginService.ts
          permissionService.ts
          manifestValidator.ts
        hermes/
          hermesService.ts
          hermesCommandGateway.ts
          hermesExtensionInstaller.ts
          luaRuntimeLocator.ts
        secrets/
          secretsService.ts
          keychainProvider.ts
          encryptedFileProvider.ts
        diagnostics/
          diagnosticsService.ts
          performanceService.ts
          logService.ts
        filesystem/
          appPaths.ts
          safeFileService.ts
          migrationService.ts
        updater/
          updateService.ts
      security/
        csp.ts
        permissions.ts
        redaction.ts
        trustedOrigins.ts
      platform/
        steamDeck.ts
        linux.ts
        windows.ts
        macos.ts

    preload/
      index.ts
      exposeApi.ts
      apiTypes.ts

    renderer/
      main.tsx
      App.tsx
      routes/
        router.tsx
        WorkspaceRoute.tsx
        ModelsRoute.tsx
        AgentsRoute.tsx
        MemoryRoute.tsx
        SessionsRoute.tsx
        PluginsRoute.tsx
        HermesRoute.tsx
        DiagnosticsRoute.tsx
        SettingsRoute.tsx
      components/
        foundation/
        navigation/
        workspace/
        models/
        agents/
        memory/
        sessions/
        plugins/
        hermes/
        diagnostics/
        settings/
      design-system/
        tokens/
          tokens.css
          themes/
            blacksite.css
            tactical-glass.css
            high-contrast.css
            reduced-motion.css
          tailwindTokens.ts
        components.json
      state/
        appStore.ts
        workspaceStore.ts
        controllerStore.ts
      hooks/
        useControllerFocus.ts
        useIpcQuery.ts
        useReducedMotion.ts
      lib/
        apiClient.ts
        format.ts
        errors.ts
      styles/
        globals.css
        steamdeck.css

    shared/
      contracts/
        ipc.ts
        models.ts
        memory.ts
        sessions.ts
        agents.ts
        plugins.ts
        hermes.ts
        diagnostics.ts
        settings.ts
      schemas/
        appConfig.schema.ts
        pluginManifest.schema.ts
        hermesExtension.schema.ts
        modelProvider.schema.ts
      constants/
        channels.ts
        release.ts
        paths.ts
      types/
        result.ts
        errors.ts

  resources/
    icons/
    fonts/
    steamdeck/
      neurodeck.desktop
      launch-neurodeck.sh
      steam-input-template.vdf
    hermes/
      extensions/
      templates/

  scripts/
    dev/
    build/
    package/
    release/
    steamdeck/
      install-steamdeck.sh
      uninstall-steamdeck.sh
      doctor-steamdeck.sh

  tests/
    unit/
    integration/
    e2e/
    security/
    fixtures/

  docs/
    prd/
    sds/
    adr/
    security/
    release/
```

### 3.1 Folder Ownership Rules

| Folder | Owner | Rule |
|---|---|---|
| `src/main` | Electron/backend engineers | privileged APIs only here |
| `src/preload` | security-sensitive bridge | must stay tiny and typed |
| `src/renderer` | frontend engineers | no Node access |
| `src/shared` | all teams | contracts only, no platform side effects |
| `resources` | release/design | static assets and launchers only |
| `scripts` | release/devops | no app logic |
| `docs/adr` | architecture owner | every major decision gets an ADR |

---

## 4. Electron Process Model

### 4.1 Main Process

The main process owns all privileged operations:

- creating and managing windows
- app lifecycle events
- native menus where needed
- application paths
- secure IPC handlers
- local model subprocesses
- filesystem access
- database access
- secrets access
- plugin installation and validation
- Hermes Lua runtime execution
- diagnostics collection
- update checks
- crash recovery

The renderer must never import Node APIs or access Electron modules directly.

### 4.2 Renderer Process

The renderer owns only presentation and user interaction:

- React route rendering
- UI components
- controller focus graph
- local client state
- async request display
- error cards
- design tokens
- accessibility presentation

The renderer accesses app capabilities only through `window.neurodeck`, exposed by preload.

### 4.3 Preload Bridge

The preload script is a narrow, typed API façade. It must expose only stable app APIs.

Allowed preload responsibilities:

- expose typed invoke/send/subscribe wrappers
- validate obvious parameter shape where useful
- hide raw channel names from UI components
- normalize event unsubscribe behavior

Forbidden preload responsibilities:

- executing shell commands
- reading arbitrary files
- exposing `ipcRenderer` directly
- exposing Node globals
- storing secrets
- business logic
- plugin execution

### 4.4 BrowserWindow Security Baseline

Every production BrowserWindow must use a hardened baseline:

```ts
const win = new BrowserWindow({
  width: 1280,
  height: 800,
  minWidth: 1024,
  minHeight: 640,
  backgroundColor: '#0A0D10',
  show: false,
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    devTools: !app.isPackaged || process.env.NEURODECK_ENABLE_DEVTOOLS === '1'
  }
})
```

### 4.5 Navigation and Window Open Policy

Production must block untrusted navigation:

```ts
win.webContents.on('will-navigate', (event, url) => {
  if (!isTrustedAppUrl(url)) event.preventDefault()
})

win.webContents.setWindowOpenHandler(({ url }) => {
  if (isAllowedExternalUrl(url)) {
    shell.openExternal(url)
  }
  return { action: 'deny' }
})
```

The app must not use remote web content for the main UI. The renderer must load packaged local assets in production.

---

## 5. IPC Architecture

### 5.1 IPC Principles

IPC is the spine of NEURODECK. It must be treated like an internal API, not casual message spaghetti.

Rules:

1. Every channel must be listed in the IPC registry.
2. Every payload must have a Zod schema.
3. Every response must use the shared `Result<T>` shape.
4. Renderer must not know raw filesystem paths unless the path is safe user-facing data.
5. Renderer must not receive raw secrets.
6. Renderer must not request arbitrary shell execution.
7. IPC handlers must be registered in one place.
8. Long-running operations must support progress events, cancellation, or both.
9. IPC errors must become typed recoverable UI errors.
10. IPC payloads must be logged only after redaction.

### 5.2 IPC Result Shape

```ts
export type Result<T> =
  | {
      ok: true
      data: T
      warnings?: AppWarning[]
      meta?: Record<string, unknown>
    }
  | {
      ok: false
      error: AppError
      meta?: Record<string, unknown>
    }

export interface AppError {
  code: string
  message: string
  userMessage: string
  severity: 'info' | 'warning' | 'error' | 'fatal'
  retryable: boolean
  details?: Record<string, unknown>
}
```

### 5.3 IPC Channel Naming

Use domain-prefixed action names:

```text
app:getVersion
app:getRuntimeInfo
settings:get
settings:update
model:list
model:runPrompt
model:cancelRun
session:create
session:list
session:load
session:delete
memory:search
memory:add
agent:list
agent:activate
plugin:list
plugin:install
plugin:setTrust
hermes:doctor
hermes:runCommand
diagnostics:getReport
```

### 5.4 IPC Registration Pattern

All handlers must be registered from `registerIpcHandlers.ts`:

```ts
export function registerIpcHandlers(ctx: MainContext) {
  registerAppHandlers(ctx)
  registerSettingsHandlers(ctx)
  registerModelHandlers(ctx)
  registerSessionHandlers(ctx)
  registerMemoryHandlers(ctx)
  registerAgentHandlers(ctx)
  registerPluginHandlers(ctx)
  registerHermesHandlers(ctx)
  registerDiagnosticsHandlers(ctx)
}
```

Each domain gets its own module:

```ts
export function registerModelHandlers(ctx: MainContext) {
  ipcMain.handle(Channels.ModelRunPrompt, async (_event, raw) => {
    const input = ModelRunPromptSchema.parse(raw)
    return ctx.modelService.runPrompt(input)
  })
}
```

### 5.5 Streaming Responses

Model output must support token streaming without blocking the UI.

Recommended pattern:

1. Renderer calls `model:runPrompt`.
2. Main validates input and creates a run ID.
3. Main returns `{ runId }`.
4. Main emits `model:token` events with run ID.
5. Main emits `model:complete` or `model:error`.
6. Renderer updates the response card.

```ts
export interface ModelTokenEvent {
  runId: string
  sessionId: string
  messageId: string
  token: string
  index: number
}
```

### 5.6 Cancellation

Any model call longer than 3 seconds must support cancellation.

```ts
model:cancelRun({ runId: string }): Result<{ cancelled: boolean }>
```

The local provider adapter must translate cancellation into subprocess termination, abort signal, or provider-native cancel where available.

---

## 6. Preload API Contract

### 6.1 Public Renderer API

The renderer receives one global namespace:

```ts
declare global {
  interface Window {
    neurodeck: NeuroDeckApi
  }
}
```

Shape:

```ts
export interface NeuroDeckApi {
  app: AppApi
  settings: SettingsApi
  models: ModelsApi
  sessions: SessionsApi
  memory: MemoryApi
  agents: AgentsApi
  plugins: PluginsApi
  hermes: HermesApi
  diagnostics: DiagnosticsApi
  events: EventsApi
}
```

### 6.2 Event Subscription Contract

Every event subscription returns an unsubscribe function:

```ts
const unsubscribe = window.neurodeck.events.onModelToken((event) => {
  // update stream
})

unsubscribe()
```

No renderer component may subscribe without cleanup.

### 6.3 Example Exposed API

```ts
contextBridge.exposeInMainWorld('neurodeck', {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getRuntimeInfo: () => ipcRenderer.invoke('app:getRuntimeInfo')
  },
  models: {
    list: (input) => ipcRenderer.invoke('model:list', input),
    runPrompt: (input) => ipcRenderer.invoke('model:runPrompt', input),
    cancelRun: (input) => ipcRenderer.invoke('model:cancelRun', input)
  },
  events: {
    onModelToken: (callback) => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('model:token', listener)
      return () => ipcRenderer.removeListener('model:token', listener)
    }
  }
})
```

The real implementation must wrap this with channel constants and TypeScript types, not hard-coded strings.

---

## 7. Domain Service Architecture

### 7.1 Main Context

All main services receive a single dependency container:

```ts
export interface MainContext {
  appPaths: AppPaths
  logger: LogService
  settingsService: SettingsService
  secretsService: SecretsService
  modelService: ModelService
  sessionService: SessionService
  memoryService: MemoryService
  agentService: AgentService
  pluginService: PluginService
  hermesService: HermesService
  diagnosticsService: DiagnosticsService
  permissionService: PermissionService
}
```

No service should import global singletons except Electron primitives in tightly isolated platform modules.

### 7.2 Service Boundary Rules

| Service | Owns | Cannot Own |
|---|---|---|
| SettingsService | app config, user preferences | raw provider secret values |
| SecretsService | API keys, tokens, credential references | UI display state |
| ModelService | provider registry, prompt execution, streaming | transcript persistence |
| SessionService | session metadata, transcript save/load | model execution |
| MemoryService | local memory, context packs, search | secrets or plugin execution |
| AgentService | persona/agent config and activation | provider credentials |
| PluginService | plugin manifests, trust, lifecycle | shell execution without permission |
| HermesService | Lua extension discovery and command gateway | unrestricted filesystem access |
| DiagnosticsService | health reports, perf snapshots | raw secrets or full transcripts by default |

### 7.3 Error Propagation

All services must throw or return typed `AppError` instances. UI must never display raw stack traces in production.

Recommended error code pattern:

```text
ND_<DOMAIN>_<ERROR>
```

Examples:

```text
ND_MODEL_PROVIDER_NOT_CONFIGURED
ND_MODEL_RUN_CANCELLED
ND_SECRET_ACCESS_DENIED
ND_PLUGIN_PERMISSION_DENIED
ND_HERMES_EXTENSION_UNTRUSTED
ND_STEAMDECK_LAUNCHER_MISSING
```

---

## 8. Data Storage Architecture

### 8.1 App Data Locations

Use Electron's app path APIs and platform-appropriate storage.

| Data | Location | Notes |
|---|---|---|
| config | userData | JSON with schema validation |
| secrets | OS keychain or encrypted file fallback | never committed |
| sessions | userData/sessions | JSONL or SQLite |
| memory | userData/memory | SQLite preferred |
| logs | logs path | redacted |
| plugins | userData/plugins | manifests + extension code |
| Hermes extensions | userData/hermes/extensions | trust metadata required |
| cache | cache path | safe to delete |
| model metadata | userData/models | no model binaries in v1 unless configured |

### 8.2 Suggested Linux/Steam Deck Paths

```text
/home/deck/.config/neurodeck/
/home/deck/.local/share/neurodeck/
/home/deck/.cache/neurodeck/
/home/deck/.local/share/neurodeck/logs/
```

### 8.3 Config Schema

```ts
export interface AppConfig {
  version: number
  appearance: {
    theme: 'blacksite' | 'tacticalGlass' | 'highContrast' | 'minimalOps'
    reducedMotion: boolean
    fontScale: number
  }
  steamDeck: {
    gameModeOptimized: boolean
    controllerGlyphs: 'steamDeck' | 'xbox' | 'playstation' | 'auto'
    targetResolution: '1280x800' | '1280x720' | 'auto'
  }
  models: {
    defaultProviderId?: string
    providers: ModelProviderConfig[]
  }
  privacy: {
    allowDiagnosticsExport: boolean
    includeTranscriptsInDiagnostics: false
  }
  hermes: {
    enabled: boolean
    trustedExtensionsOnly: boolean
    shellExecutionDefault: false
  }
}
```

### 8.4 Session Model

```ts
export interface Session {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  activeModelId?: string
  activeAgentId?: string
  tags: string[]
  messages: SessionMessage[]
}

export interface SessionMessage {
  id: string
  role: 'system' | 'user' | 'assistant' | 'tool' | 'error'
  content: string
  createdAt: string
  modelId?: string
  agentId?: string
  metadata?: Record<string, unknown>
}
```

### 8.5 Memory Model

```ts
export interface MemoryRecord {
  id: string
  scope: 'global' | 'project' | 'session' | 'agent'
  title: string
  content: string
  source: 'user' | 'session' | 'import' | 'plugin'
  createdAt: string
  updatedAt: string
  tags: string[]
  embeddingRef?: string
  sensitivity: 'normal' | 'private' | 'secret-adjacent'
}
```

Memory marked `secret-adjacent` must never be included in diagnostics exports unless explicitly selected by the user.

---

## 9. Model Provider Architecture

### 9.1 Provider Types

NEURODECK must support a provider registry with adapters.

| Provider Type | v1 Status | Notes |
|---|---|---|
| Local CLI model runner | required | e.g. Ollama-compatible, llama.cpp wrapper, or custom command adapter |
| OpenAI-compatible HTTP provider | required if remote models supported | key via secrets service |
| Custom local endpoint | required | user-defined localhost URL |
| Future cloud providers | deferred | must use same provider contract |

### 9.2 Provider Adapter Contract

```ts
export interface ModelProviderAdapter {
  id: string
  name: string
  kind: 'local-cli' | 'local-http' | 'remote-http'
  capabilities: ModelCapability[]
  healthCheck(): Promise<Result<ProviderHealth>>
  listModels(): Promise<Result<ModelDescriptor[]>>
  runPrompt(input: RunPromptInput, signal: AbortSignal): AsyncIterable<ModelStreamEvent>
}
```

### 9.3 Prompt Execution Flow

```text
Renderer submits prompt
  ↓
Preload invokes model:runPrompt
  ↓
Main validates payload
  ↓
SessionService creates pending assistant message
  ↓
ModelService resolves provider
  ↓
Provider adapter starts stream
  ↓
Main emits model:token events
  ↓
Renderer updates response card
  ↓
SessionService commits final message
  ↓
MemoryService optionally indexes result
```

### 9.4 Provider Security

- Provider API keys must be stored through SecretsService.
- Provider request logs must redact auth headers and request body fields likely to include secrets.
- Remote provider URLs must be user-approved.
- Localhost providers must default to `127.0.0.1`, not `0.0.0.0`.
- Renderer must not construct raw provider HTTP requests.

---

## 10. Agent and Persona Architecture

### 10.1 Persona Definition

```ts
export interface Persona {
  id: string
  name: string
  description: string
  systemPrompt: string
  tone: 'technical' | 'mentor' | 'direct' | 'creative' | 'security' | 'writer'
  icon?: string
  colorToken?: string
  defaultModelId?: string
}
```

### 10.2 Agent Definition

```ts
export interface Agent {
  id: string
  name: string
  role: 'developer' | 'architect' | 'security' | 'tester' | 'documenter' | 'researcher' | 'custom'
  description: string
  personaId: string
  tools: AgentToolPermission[]
  memoryScope: 'none' | 'session' | 'project' | 'global'
  enabled: boolean
}
```

### 10.3 v1 Agent Limitation

NEURODECK v1 must avoid uncontrolled autonomous behavior. Agents may assist and call approved tools, but must not run arbitrary shell commands, modify files, install plugins, or execute Hermes commands without explicit permission.

---

## 11. Hermes Lua Extension Architecture

### 11.1 Purpose

Hermes provides Lua-based automation and extension wiring. In NEURODECK, Hermes is not a free-for-all scripting hole. It is a controlled extension subsystem behind the main process.

### 11.2 Extension Lifecycle

```text
Discover extension manifest
  ↓
Validate schema
  ↓
Check trust state
  ↓
Check permissions
  ↓
Install/copy into app userData
  ↓
Register commands/events
  ↓
Expose safe command list to renderer
  ↓
Execute through HermesService only
```

### 11.3 Hermes Manifest

```lua
return {
  id = "tryhackme_steamdeck",
  name = "TryHackMe Steam Deck Launcher",
  version = "1.0.0",
  description = "Game Mode launcher wiring for TryHackMe",
  permissions = {
    filesystem = "app",
    shell = false,
    network = false,
    secrets = false
  },
  commands = {
    "install",
    "doctor",
    "uninstall"
  }
}
```

### 11.4 Permission Model

| Permission | Default | Meaning |
|---|---|---|
| `filesystem:none` | safest | no file access |
| `filesystem:app` | allowed for trusted | app-owned extension folder only |
| `filesystem:project` | trusted only | selected project workspace |
| `filesystem:full` | blocked by default | requires explicit override |
| `shell` | false | run commands/subprocesses |
| `network` | false | make network requests |
| `secrets` | false | request secret references, never raw by default |

### 11.5 Execution Policy

Hermes commands are invoked through:

```ts
hermes:runCommand({
  extensionId: string,
  command: string,
  args: Record<string, unknown>
})
```

Before execution, HermesService must verify:

- extension exists
- manifest is valid
- extension is trusted if trust required
- command is declared in manifest
- requested permissions are granted
- arguments pass schema validation if command schema exists
- shell/network access is not silently escalated

### 11.6 Renderer Exposure

Renderer may see:

- extension ID
- extension name
- description
- version
- declared commands
- permission summary
- trust state
- last run status

Renderer may not receive:

- raw extension source code by default
- secrets
- unrestricted filesystem paths
- shell command strings from untrusted extensions

---

## 12. Plugin Architecture

### 12.1 Plugin vs Hermes Extension

| Type | Use Case | Runtime |
|---|---|---|
| React UI plugin | future UI extension | renderer sandbox / deferred |
| Main service plugin | trusted local capability | main process service boundary |
| Hermes Lua extension | automation/workflow wiring | Lua runtime through HermesService |

For v1, prioritize Hermes Lua extensions and manifest-based command plugins. Defer arbitrary renderer UI plugins unless a sandbox model is fully designed.

### 12.2 Plugin Manifest

```ts
export interface PluginManifest {
  id: string
  name: string
  version: string
  type: 'hermes-lua' | 'command-pack'
  description: string
  author?: string
  permissions: PluginPermissions
  commands: PluginCommandDefinition[]
  minimumNeurodeckVersion: string
}
```

### 12.3 Trust States

```text
untrusted
trusted-local
trusted-user-approved
disabled
blocked
```

Untrusted plugins may be listed but not executed.

---

## 13. UI Architecture

### 13.1 Renderer Route Map

| Route | Purpose | Required for v1 |
|---|---|---|
| `/` | boot redirect | yes |
| `/workspace` | main AI chat and context screen | yes |
| `/models` | model provider and model manager | yes |
| `/agents` | persona/agent manager | yes |
| `/memory` | local memory manager | yes |
| `/sessions` | session browser | yes |
| `/plugins` | plugin manager | yes |
| `/hermes` | Hermes extension manager | yes |
| `/diagnostics` | health reports and troubleshooting | yes |
| `/settings` | app configuration | yes |

### 13.2 Component Layering

```text
foundation → layout → domain components → screens/routes
```

Foundation components must not call IPC directly. Domain screens may use hooks that wrap `window.neurodeck`.

### 13.3 Required Component Families

```text
Foundation:
  Button, IconButton, Input, Textarea, Select, Toggle, Slider, Badge, Tooltip, Modal

Layout:
  AppShell, StatusBar, SideRail, FocusPanel, SplitPane, OverlayHost

Workspace:
  ChatViewport, MessageCard, TokenStream, InputConsole, ContextTray, AgentStatusPanel

Models:
  ProviderCard, ModelList, ModelHealthBadge, ProviderSetupWizard

Agents:
  PersonaCard, AgentCard, ToolPermissionList

Memory:
  MemoryRecordCard, MemorySearch, ContextPackPanel

Sessions:
  SessionCard, SessionTimeline, ExportDialog

Plugins/Hermes:
  ExtensionCard, PermissionBadge, TrustPrompt, CommandRunner

Diagnostics:
  HealthCheckList, LogViewer, PerformanceMeter, ExportReportButton
```

### 13.4 Controller Focus Graph

Every interactive element must be reachable by controller. The renderer must maintain a focus graph independent of DOM tab order where needed.

```ts
export interface FocusNode {
  id: string
  route: string
  selector: string
  up?: string
  down?: string
  left?: string
  right?: string
  action?: string
  cancel?: string
  priority: number
}
```

Controller focus must support:

- D-pad navigation
- left stick navigation where reasonable
- confirm/select
- cancel/back
- shoulder tab switching
- grip shortcut mapping documentation
- emergency escape to command palette or sidebar

---

## 14. Design Token Implementation

### 14.1 Token Sources

Use CSS variables as runtime theme source and Tailwind config as compile-time helper.

```css
:root {
  --nd-surface-primary: #0A0D10;
  --nd-surface-secondary: #11161C;
  --nd-text-primary: #E8F4FF;
  --nd-text-secondary: #8DA1B3;
  --nd-accent-primary: #5EEBFF;
  --nd-accent-success: #7CFFB2;
  --nd-accent-warning: #FFC857;
  --nd-accent-error: #FF5A6A;
}
```

### 14.2 Steam Deck Breakpoints

```ts
screens: {
  deck: '1280px',
  desktop: '1440px',
  wide: '1920px'
}
```

Do not design the app around mobile breakpoints. Steam Deck is small but not a phone.

### 14.3 Motion Tokens

```css
:root {
  --nd-motion-fast: 90ms;
  --nd-motion-normal: 160ms;
  --nd-motion-slow: 240ms;
  --nd-ease-standard: cubic-bezier(0.2, 0, 0, 1);
}

[data-reduced-motion="true"] * {
  animation-duration: 1ms !important;
  transition-duration: 1ms !important;
}
```

### 14.4 Forbidden UI Effects

For Steam Deck performance, avoid:

- heavy backdrop blur over large surfaces
- full-screen shader effects
- particle storms
- continuous layout thrashing animations
- infinite expensive shadows
- tiny text below readable Deck distance

---

## 15. Steam Deck Runtime Design

### 15.1 Launch Model

The production Linux package must include:

```text
resources/steamdeck/neurodeck.desktop
resources/steamdeck/launch-neurodeck.sh
scripts/steamdeck/install-steamdeck.sh
scripts/steamdeck/doctor-steamdeck.sh
```

The user-supported path is:

1. Install NEURODECK in Desktop Mode.
2. Add NEURODECK as a non-Steam game.
3. Launch from Steam Deck Game Mode.
4. Use controller-first interface.

### 15.2 Launch Script Responsibilities

The launch script may:

- set app-specific environment variables
- force app data path if needed
- prefer Wayland/XWayland-compatible flags
- set initial resolution hints
- launch AppImage or unpacked binary
- write launcher logs

The launch script must not:

- modify Steam internal shortcut files directly by default
- change system packages without user consent
- require disabling SteamOS readonly mode for normal install
- require sudo for normal app launch

### 15.3 Steam Deck Game Mode Acceptance

Required:

- starts from Game Mode
- runs at 1280x800 without clipping
- controller can reach every critical action
- virtual keyboard can enter text
- suspend/resume does not corrupt sessions
- app recovers from offline state
- app exits cleanly back to Steam UI

---

## 16. Security Architecture

### 16.1 Security Baseline

Production BrowserWindows must use:

```text
contextIsolation: true
nodeIntegration: false
sandbox: true
webSecurity: true
allowRunningInsecureContent: false
remote module disabled / not used
CSP enforced
navigation blocked except trusted URLs
external links opened through shell.openExternal after validation
```

### 16.2 Content Security Policy

Production CSP should be strict:

```text
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: file:;
font-src 'self' file:;
connect-src 'self' http://127.0.0.1:* https://api.openai.com https://*.openai.com;
object-src 'none';
base-uri 'none';
frame-ancestors 'none';
```

The actual remote provider allowlist must be generated from configured providers and reviewed.

### 16.3 Secrets Handling

Rules:

- SecretsService owns all secret values.
- Renderer may submit a secret value during setup, but it must not be persisted in renderer state.
- Renderer may receive secret status metadata only.
- Logs redact secrets before write.
- Diagnostics excludes secrets by default.
- Clipboard operations involving secrets require explicit user action.

Secret status example:

```ts
export interface SecretStatus {
  id: string
  label: string
  exists: boolean
  updatedAt?: string
  provider: 'keychain' | 'encrypted-file'
}
```

### 16.4 Log Redaction

Redact keys matching:

```text
api_key
apikey
token
authorization
password
secret
private_key
cookie
session
bearer
```

Redaction must run before console/file output.

### 16.5 Threat Model Summary

| Threat | Mitigation |
|---|---|
| Renderer XSS reaches Node APIs | contextIsolation + nodeIntegration false + sandbox |
| Malicious plugin executes shell | manifest permissions + trust prompts + shell disabled |
| API key leaks to renderer logs | SecretsService metadata-only status + redaction |
| Arbitrary IPC misuse | schema validation + channel registry + no generic shell/file channels |
| Remote content hijacks app | packaged UI + navigation deny policy + CSP |
| Local service exposed on network | bind 127.0.0.1 only |
| Extension modifies user files | scoped filesystem permission |
| Diagnostic export leaks private data | explicit export options + default transcript exclusion |

---

## 17. Diagnostics and Observability

### 17.1 Diagnostics Service

Diagnostics must provide:

- app version
- Electron/Chromium/Node versions
- OS and Steam Deck detection
- display resolution
- controller detection if available
- storage availability
- model provider health
- Hermes extension health
- plugin health
- config validation
- recent redacted errors
- performance snapshot

### 17.2 Diagnostics Report Shape

```ts
export interface DiagnosticsReport {
  generatedAt: string
  app: AppRuntimeInfo
  platform: PlatformInfo
  checks: DiagnosticCheck[]
  warnings: AppWarning[]
  redactedLogs?: string[]
}
```

### 17.3 Health Check Levels

```text
pass
warn
fail
skip
```

Failures block release if they affect startup, secrets, model execution, controller navigation, or data integrity.

---

## 18. Update and Migration Architecture

### 18.1 Config Migrations

Config migrations must be versioned:

```ts
export interface Migration {
  id: string
  fromVersion: number
  toVersion: number
  up(config: unknown): AppConfig
}
```

### 18.2 Data Migrations

Session and memory data migrations must:

- backup affected data first
- be idempotent when possible
- write migration logs
- fail safely without deleting original files

### 18.3 Update Strategy

For v1:

- Linux AppImage manual update is acceptable.
- Windows installer update may be manual or assisted.
- Auto-update is deferred unless code signing and platform updater are fully configured.

No silent update system should be enabled before signing, rollback, and integrity verification are defined.

---

## 19. Error Handling Strategy

### 19.1 Error Display

All user-facing errors must render as recovery cards with:

- plain-English problem
- likely cause
- retry action if available
- details toggle
- copy diagnostics action
- link to relevant settings when possible

### 19.2 Fatal Errors

Fatal startup failures should show a minimal recovery window, not a blank app.

Fatal examples:

- config unreadable and migration failed
- app data path unavailable
- renderer failed to load packaged assets
- incompatible runtime environment

### 19.3 Offline Behavior

The app must continue to open offline. Remote providers may show unavailable status. Local sessions, memory, settings, Hermes manager, and diagnostics must remain usable.

---

## 20. Testing Architecture

### 20.1 Test Types

| Type | Tool | Required Scope |
|---|---|---|
| Unit | Vitest | schemas, services, utilities |
| Component | Testing Library | renderer components |
| IPC integration | Vitest + Electron harness | channel validation and responses |
| E2E | Playwright | main user journeys |
| Security | custom tests + dependency audit | IPC, preload, CSP, secrets |
| Steam Deck manual QA | release checklist | Game Mode, controller, suspend/resume |

### 20.2 Required E2E Scenarios

```text
Launch app
Complete onboarding
Add local provider
Send prompt
Cancel prompt
Create session
Rename session
Search memory
Switch persona
Open Hermes manager
Run Hermes doctor
Open settings
Export diagnostics
Use controller-only navigation path
Recover from simulated provider failure
```

### 20.3 Security Tests

Must verify:

- `window.require` is unavailable
- `window.process` is unavailable unless intentionally mocked safe
- `window.electron` raw API is unavailable
- only `window.neurodeck` exists for app bridge
- unknown IPC channel cannot be invoked through public API
- secrets are redacted from logs
- plugin without trust cannot execute
- Hermes command not declared in manifest cannot execute

---

## 21. Build and Packaging

### 21.1 Package Targets

| Platform | Package | Required |
|---|---|---|
| Steam Deck/Linux | AppImage | yes |
| Steam Deck/Linux | `.desktop` launcher | yes |
| Windows | NSIS installer or portable exe | yes |
| macOS | dmg | optional/deferred for first release |

### 21.2 Build Commands

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "dev:electron": "electron-vite dev",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "build": "electron-vite build",
    "package:linux": "electron-builder --linux AppImage",
    "package:windows": "electron-builder --win nsis",
    "steamdeck:doctor": "bash scripts/steamdeck/doctor-steamdeck.sh"
  }
}
```

### 21.3 Release Artifact Requirements

Every release must include:

```text
NEURODECK-x.y.z.AppImage
NEURODECK-x.y.z.exe or installer
SHA256SUMS.txt
release-notes.md
steamdeck-install.md
known-issues.md
```

---

## 22. CI/CD Requirements

### 22.1 Required CI Gates

```text
install dependencies
lint
typecheck
unit tests
component tests
IPC contract tests
security static checks
build renderer
build Electron main/preload
package Linux AppImage
generate checksums
upload artifacts
```

### 22.2 Blockers

Release must block on:

- TypeScript errors
- lint security errors
- failing unit/integration tests
- missing IPC schemas
- missing release checksums
- high/critical dependency vulnerabilities without waiver
- preload exposing raw IPC or Node APIs
- production `nodeIntegration: true`
- production `contextIsolation: false`
- production `sandbox: false` without approved ADR

---

## 23. Architecture Decision Records

All major technical choices must get an ADR in `docs/adr`.

Initial ADRs:

```text
ADR-001 Electron as canonical app shell
ADR-002 React + TypeScript renderer
ADR-003 Secure preload bridge pattern
ADR-004 Hermes Lua extension runtime boundary
ADR-005 Steam Deck AppImage distribution
ADR-006 Local-first storage strategy
ADR-007 Secrets service provider strategy
ADR-008 Model provider adapter pattern
```

Each ADR must include:

```text
Status
Context
Decision
Consequences
Alternatives considered
Security impact
Testing impact
```

---

## 24. Release Gates

### 24.1 Production Readiness Gate

NEURODECK v1.0 is production-ready only when:

- all PRD P0 requirements pass
- all IPC channels are typed and tested
- all BrowserWindows follow security baseline
- Steam Deck Game Mode launch passes
- controller-only workflow passes
- secrets never leak to renderer or logs
- Hermes extension trust model works
- local sessions persist across restart
- diagnostics export works with redaction
- packaging outputs checksummed artifacts

### 24.2 Steam Deck Gate

Pass criteria:

```text
1280x800 layout without clipping
Game Mode launch works
Desktop Mode launch works
controller navigation reaches all P0 actions
virtual keyboard works for prompt input
suspend/resume preserves active session
offline startup works
exit returns to Steam UI
```

---

## 25. Implementation Sequence

### Phase 1 — Shell Foundation

- create Electron + React + TypeScript project
- implement main/preload/renderer split
- apply BrowserWindow security baseline
- create app shell route layout
- create design token CSS foundation
- implement diagnostics stub

### Phase 2 — IPC and Services

- create IPC registry
- create Zod schemas
- create Result/Error model
- implement settings service
- implement app runtime info
- implement log redaction

### Phase 3 — Workspace MVP

- implement workspace route
- implement input console
- implement message cards
- implement session persistence
- implement provider registry stub
- implement local/custom provider adapter

### Phase 4 — Models, Agents, Memory

- model manager
- provider health checks
- persona manager
- agent manager
- memory CRUD/search

### Phase 5 — Hermes Extensions

- Hermes manager UI
- extension manifest validator
- trust states
- command registry
- doctor command

### Phase 6 — Steam Deck Packaging

- AppImage config
- launcher script
- `.desktop` file
- Steam Deck doctor script
- Game Mode QA

### Phase 7 — Hardening

- security tests
- E2E tests
- diagnostics export
- crash recovery
- release gates

---

## 26. AI Coding Agent Implementation Rules

When an AI agent builds NEURODECK, it must follow these rules:

1. Do not place Node or Electron APIs in renderer code.
2. Do not create generic `executeCommand` IPC.
3. Do not expose `ipcRenderer` directly.
4. Do not store secrets in config JSON.
5. Do not build UI components that bypass controller focus rules.
6. Do not add remote webviews for core UI.
7. Do not skip Zod validation on IPC.
8. Do not mark untrusted Hermes extensions as executable.
9. Do not add auto-update without signing/integrity plan.
10. Do not remove Steam Deck release gates.

If forced to make a tradeoff, preserve security and data integrity over visual polish.

---

## 27. Appendix A — Required Source References

This SDS is aligned with these upstream technical references:

- Electron Process Model: https://electronjs.org/docs/latest/tutorial/process-model
- Electron Context Isolation: https://electronjs.org/docs/latest/tutorial/context-isolation
- Electron IPC: https://electronjs.org/docs/latest/tutorial/ipc
- Electron Security: https://electronjs.org/docs/latest/tutorial/security
- Electron Process Sandboxing: https://electronjs.org/docs/latest/tutorial/sandbox
- Valve Steam Deck Desktop FAQ / Non-Steam app flow: https://help.steampowered.com/en/faqs/view/671A-4453-E8D2-323C

---

## 28. Appendix B — Definition of Done

A feature is done only when:

- requirement ID exists
- UI is implemented
- IPC contract is typed
- payload schema exists
- service implementation exists
- errors are recoverable
- tests exist
- controller navigation works
- accessibility states are covered
- security concerns are documented
- diagnostics impact is defined
- release gate impact is known

No vibes-only features. Ship contracts, not smoke.
