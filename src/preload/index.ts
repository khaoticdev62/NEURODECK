import { contextBridge, ipcRenderer } from 'electron'
import {
  agentRunSchema,
  IPC_CHANNELS,
  terminalDataEventSchema,
  terminalExitEventSchema,
  type NdxBridge
} from '../shared/contracts'

/**
 * The real, narrow, typed bridge (mega-prompt §6, §14) replacing the
 * generic `@electron-toolkit/preload` wrapper that shipped from Epic 0 —
 * that wrapper was flagged in `docs/security/NDX_SECURITY_ARCHITECTURE.md`
 * as wider than spec's "narrowly scoped, typed APIs" requirement, and
 * nothing in the renderer used it. This is its real replacement: each
 * method maps to exactly one validated IPC channel, never a raw
 * `ipcRenderer.send`/`on` passthrough. The `NdxBridge` type lives in
 * `shared/contracts` (not here) so the renderer can reference it without
 * crossing into preload's TypeScript project.
 */
const ndx: NdxBridge = {
  workspaces: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.workspaceList),
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.workspaceCreate, request),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.workspaceRemove, { id }),
    pickFolder: () => ipcRenderer.invoke(IPC_CHANNELS.workspacePickFolder)
  },
  files: {
    list: (request) => ipcRenderer.invoke(IPC_CHANNELS.fileList, request),
    read: (request) => ipcRenderer.invoke(IPC_CHANNELS.fileRead, request),
    write: (request) => ipcRenderer.invoke(IPC_CHANNELS.fileWrite, request)
  },
  recovery: {
    list: (request) => ipcRenderer.invoke(IPC_CHANNELS.recoveryList, request),
    diff: (request) => ipcRenderer.invoke(IPC_CHANNELS.recoveryDiff, request),
    restore: (request) => ipcRenderer.invoke(IPC_CHANNELS.recoveryRestore, request),
    storageSummary: (request) => ipcRenderer.invoke(IPC_CHANNELS.recoveryStorageSummary, request)
  },
  git: {
    status: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitStatus, request),
    diff: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitDiff, request),
    stage: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitStage, request),
    unstage: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitUnstage, request),
    commit: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitCommit, request),
    branches: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitBranches, request),
    checkout: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitCheckout, request),
    log: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitLog, request),
    remotes: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitRemotes, request),
    fetch: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitFetch, request),
    pull: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitPull, request),
    push: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitPush, request),
    stashSave: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitStashSave, request),
    stashList: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitStashList, request),
    stashPop: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitStashPop, request)
  },
  terminal: {
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalCreate, request),
    list: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalList, request),
    snapshot: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalSnapshot, request),
    write: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalWrite, request),
    resize: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalResize, request),
    terminate: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalTerminate, request),
    onData: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = terminalDataEventSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.terminalData, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.terminalData, handler)
    },
    onExit: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = terminalExitEventSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.terminalExit, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.terminalExit, handler)
    }
  },
  workflows: {
    list: (request) => ipcRenderer.invoke(IPC_CHANNELS.workflowList, request),
    save: (request) => ipcRenderer.invoke(IPC_CHANNELS.workflowSave, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.workflowRemove, request)
  },
  workflowRuns: {
    list: (request) => ipcRenderer.invoke(IPC_CHANNELS.workflowRunList, request),
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.workflowRunCreate, request),
    update: (request) => ipcRenderer.invoke(IPC_CHANNELS.workflowRunUpdate, request)
  },
  modelProviders: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.modelProviderList),
    add: (request) => ipcRenderer.invoke(IPC_CHANNELS.modelProviderAdd, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.modelProviderRemove, request),
    testConnection: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.modelProviderTestConnection, request),
    setEnabled: (request) => ipcRenderer.invoke(IPC_CHANNELS.modelProviderSetEnabled, request),
    route: (request) => ipcRenderer.invoke(IPC_CHANNELS.modelRoute, request),
    complete: (request) => ipcRenderer.invoke(IPC_CHANNELS.modelComplete, request),
    localStatus: (request) => ipcRenderer.invoke(IPC_CHANNELS.localModelStatus, request),
    loadLocal: (request) => ipcRenderer.invoke(IPC_CHANNELS.localModelLoad, request),
    unloadLocal: (request) => ipcRenderer.invoke(IPC_CHANNELS.localModelUnload, request),
    benchmarkLocal: (request) => ipcRenderer.invoke(IPC_CHANNELS.localModelBenchmark, request)
  },
  agents: {
    list: (request) => ipcRenderer.invoke(IPC_CHANNELS.agentList, request),
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.agentCreate, request),
    update: (request) => ipcRenderer.invoke(IPC_CHANNELS.agentUpdate, request),
    setEnabled: (request) => ipcRenderer.invoke(IPC_CHANNELS.agentSetEnabled, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.agentRemove, request)
  },
  agentRuns: {
    list: (request) => ipcRenderer.invoke(IPC_CHANNELS.agentRunList, request),
    get: (request) => ipcRenderer.invoke(IPC_CHANNELS.agentRunGet, request),
    start: (request) => ipcRenderer.invoke(IPC_CHANNELS.agentRunStart, request),
    cancel: (request) => ipcRenderer.invoke(IPC_CHANNELS.agentRunCancel, request),
    onUpdate: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = agentRunSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.agentRunUpdate, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.agentRunUpdate, handler)
    }
  },
  system: {
    collectMetrics: () => ipcRenderer.invoke(IPC_CHANNELS.systemMetricsCollect)
  },
  diagnostics: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.diagnosticsGet)
  },
  power: {
    restartApp: () => ipcRenderer.invoke(IPC_CHANNELS.powerRestartApp),
    quitApp: () => ipcRenderer.invoke(IPC_CHANNELS.powerQuitApp)
  }
}

// contextIsolation is mandatory (see src/main/security/windowSecurity.ts) so
// every production window reaches this branch; there is intentionally no
// non-isolated fallback.
contextBridge.exposeInMainWorld('ndx', ndx)
