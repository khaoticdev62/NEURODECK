# NEURODECK Service Boundary Map v1.0

**Project:** NEURODECK  
**Document Type:** Service Boundary Specification  
**Version:** 1.0  

---

## 1. Boundary Philosophy

NEURODECK must keep privileged work in main-owned services and presentation work in the renderer. Any feature that touches files, secrets, subprocesses, plugins, Hermes, model execution, or diagnostics belongs behind a service boundary.

---

## 2. Main Services

| Service | Primary Responsibility | Public IPC Surface | Data Owned |
|---|---|---|---|
| AppService | runtime/version/platform info | `app:*` | none |
| SettingsService | config loading, validation, migration | `settings:*` | app config |
| SecretsService | provider credentials and tokens | `secrets:*` | encrypted secrets |
| ModelService | provider registry and model runs | `model:*` | active run state |
| SessionService | sessions and transcripts | `session:*` | session data |
| MemoryService | user/project memory and context packs | `memory:*` | memory DB/index |
| AgentService | personas, agents, active state | `agent:*` | agent/persona config |
| PluginService | plugin manifests, trust, lifecycle | `plugin:*` | plugin registry |
| HermesService | Lua extension execution gateway | `hermes:*` | Hermes extension registry |
| DiagnosticsService | health checks and reports | `diagnostics:*` | diagnostics snapshots |
| UpdateService | update checks and release metadata | `updates:*` | update cache |
| SafeFileService | scoped file operations | internal only | filesystem abstraction |
| LogService | structured logging + redaction | internal only | log files |

---

## 3. Dependency Rules

Allowed dependency flow:

```text
IPC Handler → Service → Repository/Provider Adapter → Platform Utility
```

Forbidden:

```text
Renderer → filesystem
Renderer → secrets
Renderer → child_process
Renderer → Hermes runtime
Renderer → plugin source execution
Service → React renderer state
Plugin → unrestricted main context
```

---

## 4. Service Dependency Matrix

| Service | May Depend On | Must Not Depend On |
|---|---|---|
| SettingsService | SafeFileService, LogService | Renderer, Secrets raw values |
| SecretsService | KeychainProvider, EncryptedFileProvider, LogService | Renderer, PluginService |
| ModelService | SecretsService, SessionService, LogService | Renderer components |
| SessionService | SafeFileService, LogService | Model provider adapters directly |
| MemoryService | SafeFileService, vector adapter, LogService | SecretsService raw output |
| AgentService | SettingsService, MemoryService metadata | shell/plugin execution |
| PluginService | SafeFileService, PermissionService, LogService | Renderer direct execution |
| HermesService | PluginService, PermissionService, SafeFileService | raw renderer input without validation |
| DiagnosticsService | all services via read-only health APIs | raw secrets, raw transcripts by default |

---

## 5. Repository Interfaces

Each durable data domain should have a repository interface:

```ts
export interface SessionRepository {
  create(input: CreateSessionInput): Promise<SessionSummary>
  list(input: SessionListInput): Promise<SessionSummary[]>
  load(id: string): Promise<Session>
  save(session: Session): Promise<void>
  delete(id: string): Promise<void>
}
```

Storage implementation can begin as JSON/JSONL, but the interface must allow future SQLite migration.

---

## 6. Main Context Construction

`createMainContext()` is the only place where production services are composed.

```ts
export async function createMainContext(): Promise<MainContext> {
  const appPaths = createAppPaths()
  const logger = createLogService(appPaths.logs)
  const safeFileService = createSafeFileService(appPaths, logger)
  const settingsService = await createSettingsService(appPaths, safeFileService, logger)
  const secretsService = await createSecretsService(appPaths, logger)
  const permissionService = createPermissionService(settingsService, logger)

  return {
    appPaths,
    logger,
    safeFileService,
    settingsService,
    secretsService,
    permissionService,
    modelService: createModelService(/* deps */),
    sessionService: createSessionService(/* deps */),
    memoryService: createMemoryService(/* deps */),
    agentService: createAgentService(/* deps */),
    pluginService: createPluginService(/* deps */),
    hermesService: createHermesService(/* deps */),
    diagnosticsService: createDiagnosticsService(/* deps */),
    updateService: createUpdateService(/* deps */)
  }
}
```
