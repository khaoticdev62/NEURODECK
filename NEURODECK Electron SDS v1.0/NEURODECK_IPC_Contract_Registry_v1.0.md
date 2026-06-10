# NEURODECK IPC Contract Registry v1.0

**Project:** NEURODECK  
**Document Type:** IPC/API Contract Registry  
**Version:** 1.0  
**Generated:** 2026-06-09  

---

## 1. IPC Contract Rules

1. Renderer can only call APIs exposed on `window.neurodeck`.
2. Raw `ipcRenderer` is never exposed.
3. Every channel must have:
   - channel name
   - direction
   - request schema
   - response schema
   - owner service
   - security notes
   - tests
4. Every request is validated with Zod in main before use.
5. Every response uses `Result<T>`.
6. Long-running actions return a run/task ID and emit progress events.
7. Secrets never return raw values to renderer.

---

## 2. Shared Result Shape

```ts
export type Result<T> =
  | { ok: true; data: T; warnings?: AppWarning[]; meta?: Record<string, unknown> }
  | { ok: false; error: AppError; meta?: Record<string, unknown> }
```

---

## 3. Channel Registry

| Channel | Direction | Owner | Request | Response | Security Level | Test ID |
|---|---|---|---|---|---|---|
| `app:getVersion` | renderer→main | AppService | none | `AppVersion` | safe | IPC-APP-001 |
| `app:getRuntimeInfo` | renderer→main | AppService | none | `RuntimeInfo` | safe redacted | IPC-APP-002 |
| `settings:get` | renderer→main | SettingsService | none | `AppConfigPublic` | safe public config only | IPC-SET-001 |
| `settings:update` | renderer→main | SettingsService | `SettingsPatch` | `AppConfigPublic` | schema validated | IPC-SET-002 |
| `secrets:getStatus` | renderer→main | SecretsService | `SecretStatusQuery` | `SecretStatus[]` | metadata only | IPC-SEC-001 |
| `secrets:set` | renderer→main | SecretsService | `SetSecretInput` | `SecretStatus` | value write only | IPC-SEC-002 |
| `secrets:delete` | renderer→main | SecretsService | `DeleteSecretInput` | `{deleted:boolean}` | destructive confirm | IPC-SEC-003 |
| `model:listProviders` | renderer→main | ModelService | none | `ProviderSummary[]` | no secrets | IPC-MDL-001 |
| `model:listModels` | renderer→main | ModelService | `ListModelsInput` | `ModelDescriptor[]` | provider access | IPC-MDL-002 |
| `model:healthCheck` | renderer→main | ModelService | `ProviderHealthInput` | `ProviderHealth` | no secret output | IPC-MDL-003 |
| `model:runPrompt` | renderer→main | ModelService | `RunPromptInput` | `{runId,messageId}` | content redaction in logs | IPC-MDL-004 |
| `model:cancelRun` | renderer→main | ModelService | `{runId:string}` | `{cancelled:boolean}` | run ownership check | IPC-MDL-005 |
| `session:create` | renderer→main | SessionService | `CreateSessionInput` | `SessionSummary` | safe | IPC-SES-001 |
| `session:list` | renderer→main | SessionService | `SessionListInput` | `SessionSummary[]` | safe | IPC-SES-002 |
| `session:load` | renderer→main | SessionService | `{sessionId:string}` | `Session` | user data | IPC-SES-003 |
| `session:update` | renderer→main | SessionService | `UpdateSessionInput` | `SessionSummary` | user data | IPC-SES-004 |
| `session:delete` | renderer→main | SessionService | `DeleteSessionInput` | `{deleted:boolean}` | destructive confirm | IPC-SES-005 |
| `memory:search` | renderer→main | MemoryService | `MemorySearchInput` | `MemorySearchResult[]` | private data | IPC-MEM-001 |
| `memory:add` | renderer→main | MemoryService | `AddMemoryInput` | `MemoryRecord` | private data | IPC-MEM-002 |
| `memory:update` | renderer→main | MemoryService | `UpdateMemoryInput` | `MemoryRecord` | private data | IPC-MEM-003 |
| `memory:delete` | renderer→main | MemoryService | `{memoryId:string}` | `{deleted:boolean}` | destructive confirm | IPC-MEM-004 |
| `agent:listPersonas` | renderer→main | AgentService | none | `Persona[]` | safe | IPC-AGT-001 |
| `agent:listAgents` | renderer→main | AgentService | none | `Agent[]` | safe | IPC-AGT-002 |
| `agent:activate` | renderer→main | AgentService | `{agentId:string,sessionId?:string}` | `ActiveAgentState` | safe | IPC-AGT-003 |
| `plugin:list` | renderer→main | PluginService | none | `PluginSummary[]` | manifest only | IPC-PLG-001 |
| `plugin:install` | renderer→main | PluginService | `PluginInstallInput` | `PluginSummary` | validates package | IPC-PLG-002 |
| `plugin:setTrust` | renderer→main | PluginService | `PluginTrustInput` | `PluginSummary` | explicit user action | IPC-PLG-003 |
| `plugin:disable` | renderer→main | PluginService | `{pluginId:string}` | `PluginSummary` | safe | IPC-PLG-004 |
| `hermes:listExtensions` | renderer→main | HermesService | none | `HermesExtensionSummary[]` | manifest only | IPC-HMS-001 |
| `hermes:doctor` | renderer→main | HermesService | `HermesDoctorInput` | `HermesDoctorReport` | no secrets | IPC-HMS-002 |
| `hermes:runCommand` | renderer→main | HermesService | `HermesRunCommandInput` | `HermesCommandResult` | permission checked | IPC-HMS-003 |
| `diagnostics:getReport` | renderer→main | DiagnosticsService | `DiagnosticsInput` | `DiagnosticsReport` | redacted | IPC-DIA-001 |
| `diagnostics:export` | renderer→main | DiagnosticsService | `DiagnosticsExportInput` | `{path:string}` | user-selected path | IPC-DIA-002 |
| `updates:check` | renderer→main | UpdateService | none | `UpdateStatus` | safe | IPC-UPD-001 |

---

## 4. Event Registry

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `model:token` | main→renderer | `ModelTokenEvent` | streaming token |
| `model:complete` | main→renderer | `ModelCompleteEvent` | run finished |
| `model:error` | main→renderer | `ModelErrorEvent` | recoverable error |
| `diagnostics:changed` | main→renderer | `DiagnosticsDelta` | health update |
| `plugin:changed` | main→renderer | `PluginSummary` | trust/install state changed |
| `hermes:commandProgress` | main→renderer | `HermesCommandProgress` | long-running command |
| `app:suspendDetected` | main→renderer | `RuntimeEvent` | Steam Deck suspend/resume handling |
| `app:resumeDetected` | main→renderer | `RuntimeEvent` | Steam Deck suspend/resume handling |

---

## 5. Forbidden IPC Patterns

These are banned unless a future ADR explicitly overrides them:

```text
shell:execute
filesystem:readAny
filesystem:writeAny
secrets:getRaw
plugin:executeRaw
hermes:runLuaSource
app:disableSecurity
window:openUntrusted
```

---

## 6. IPC Test Requirements

Every IPC channel must have tests for:

- valid request succeeds
- invalid request is rejected
- missing fields are rejected
- extra dangerous fields are ignored or rejected
- returned error uses `AppError`
- secrets are not included in response
- logs are redacted
