# NEURODECK Data Model and Schema Specification v1.0

**Project:** NEURODECK  
**Document Type:** Data Model / Schema Specification  
**Version:** 1.0  

---

## 1. Schema Policy

All external or cross-process input must be schema-validated.

Schema boundaries:

- IPC payloads
- app config
- plugin manifests
- Hermes extension manifests
- model provider configs
- imported sessions
- imported memory packs
- diagnostics export options

---

## 2. Core TypeScript Models

```ts
export interface AppConfig {
  version: number
  appearance: AppearanceConfig
  steamDeck: SteamDeckConfig
  models: ModelsConfig
  privacy: PrivacyConfig
  hermes: HermesConfig
}

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

export interface MemoryRecord {
  id: string
  scope: 'global' | 'project' | 'session' | 'agent'
  title: string
  content: string
  source: 'user' | 'session' | 'import' | 'plugin'
  sensitivity: 'normal' | 'private' | 'secret-adjacent'
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface ModelProviderConfig {
  id: string
  name: string
  kind: 'local-cli' | 'local-http' | 'remote-http'
  endpoint?: string
  command?: string
  secretRef?: string
  enabled: boolean
}
```

---

## 3. Zod Schema Examples

```ts
export const RunPromptInputSchema = z.object({
  sessionId: z.string().min(1),
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  prompt: z.string().min(1).max(200_000),
  agentId: z.string().optional(),
  contextMemoryIds: z.array(z.string()).default([])
})
```

```ts
export const HermesRunCommandInputSchema = z.object({
  extensionId: z.string().min(1),
  command: z.string().min(1),
  args: z.record(z.string(), z.unknown()).default({}),
  confirmRiskyAction: z.boolean().default(false)
})
```

---

## 4. Persistence Strategy

| Data | v1 Storage | Future |
|---|---|---|
| App config | JSON | JSON with migrations |
| Sessions | JSONL or SQLite | SQLite preferred |
| Memory | SQLite preferred | vector index integration |
| Logs | newline JSON logs | rotation/compression |
| Plugins | filesystem + registry JSON | signed plugin registry |
| Hermes extensions | filesystem + trust registry | extension marketplace |
| Secrets | keychain/encrypted file | OS keychain-first |

---

## 5. Data Migration Rules

- Never destructively rewrite user data without backup.
- Store migration ID, date, and result.
- Failed migrations must preserve original files.
- User-facing recovery path must exist.
