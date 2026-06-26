import { contextBridge, ipcRenderer } from 'electron'
import {
  agentRunSchema,
  agentToolExecutionRequestSchema,
  browserPermissionRequestSchema,
  browserTabSchema,
  IPC_CHANNELS,
  powerStateEventSchema,
  remoteSessionDataEventSchema,
  remoteSessionExitEventSchema,
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
    pickFolder: () => ipcRenderer.invoke(IPC_CHANNELS.workspacePickFolder),
    discover: (options) => ipcRenderer.invoke(IPC_CHANNELS.workspaceDiscover, options)
  },
  files: {
    list: (request) => ipcRenderer.invoke(IPC_CHANNELS.fileList, request),
    read: (request) => ipcRenderer.invoke(IPC_CHANNELS.fileRead, request),
    write: (request) => ipcRenderer.invoke(IPC_CHANNELS.fileWrite, request),
    delete: (request) => ipcRenderer.invoke(IPC_CHANNELS.fileDelete, request)
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
    stashPop: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitStashPop, request),
    restore: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitRestore, request),
    createBranch: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitBranchCreate, request),
    deleteBranch: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitBranchDelete, request),
    forcePush: (request) => ipcRenderer.invoke(IPC_CHANNELS.gitForcePush, request)
  },
  terminal: {
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalCreate, request),
    list: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalList, request),
    snapshot: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalSnapshot, request),
    write: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalWrite, request),
    resize: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalResize, request),
    terminate: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalTerminate, request),
    runHeadless: (request) => ipcRenderer.invoke(IPC_CHANNELS.terminalRunHeadless, request),
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
    pause: (request) => ipcRenderer.invoke(IPC_CHANNELS.agentRunPause, request),
    resume: (request) => ipcRenderer.invoke(IPC_CHANNELS.agentRunResume, request),
    cancel: (request) => ipcRenderer.invoke(IPC_CHANNELS.agentRunCancel, request),
    onUpdate: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = agentRunSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.agentRunUpdate, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.agentRunUpdate, handler)
    },
    onToolRequest: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = agentToolExecutionRequestSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.agentToolRequest, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.agentToolRequest, handler)
    },
    reportToolResult: (result) => ipcRenderer.invoke(IPC_CHANNELS.agentToolResult, result)
  },
  system: {
    collectMetrics: () => ipcRenderer.invoke(IPC_CHANNELS.systemMetricsCollect)
  },
  network: {
    getDiagnostics: () => ipcRenderer.invoke(IPC_CHANNELS.networkGetDiagnostics)
  },
  diagnostics: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.diagnosticsGet)
  },
  power: {
    restartApp: () => ipcRenderer.invoke(IPC_CHANNELS.powerRestartApp),
    quitApp: () => ipcRenderer.invoke(IPC_CHANNELS.powerQuitApp),
    onStateEvent: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = powerStateEventSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.powerStateEvent, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.powerStateEvent, handler)
    }
  },
  controllerSettings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.controllerSettingsGet),
    set: (request) => ipcRenderer.invoke(IPC_CHANNELS.controllerSettingsSet, request)
  },
  displaySettings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.displaySettingsGet),
    set: (request) => ipcRenderer.invoke(IPC_CHANNELS.displaySettingsSet, request)
  },
  lock: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.lockGetStatus),
    setPin: (request) => ipcRenderer.invoke(IPC_CHANNELS.lockSetPin, request),
    removePin: (request) => ipcRenderer.invoke(IPC_CHANNELS.lockRemovePin, request),
    verifyPin: (request) => ipcRenderer.invoke(IPC_CHANNELS.lockVerifyPin, request)
  },
  browserTabs: {
    list: (request) => ipcRenderer.invoke(IPC_CHANNELS.browserTabList, request),
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.browserTabCreate, request),
    setActive: (request) => ipcRenderer.invoke(IPC_CHANNELS.browserTabSetActive, request),
    navigate: (request) => ipcRenderer.invoke(IPC_CHANNELS.browserTabNavigate, request),
    goBack: (request) => ipcRenderer.invoke(IPC_CHANNELS.browserTabGoBack, request),
    goForward: (request) => ipcRenderer.invoke(IPC_CHANNELS.browserTabGoForward, request),
    reload: (request) => ipcRenderer.invoke(IPC_CHANNELS.browserTabReload, request),
    setBounds: (request) => ipcRenderer.invoke(IPC_CHANNELS.browserTabSetBounds, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.browserTabRemove, request),
    openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.browserOpenExternal, { url }),
    onUpdate: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = browserTabSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.browserTabUpdate, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.browserTabUpdate, handler)
    },
    onPermissionRequest: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = browserPermissionRequestSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.browserPermissionRequest, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.browserPermissionRequest, handler)
    },
    respondToPermissionRequest: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.browserPermissionResponse, request),
    listPermissions: () => ipcRenderer.invoke(IPC_CHANNELS.browserPermissionList),
    revokePermission: (request) => ipcRenderer.invoke(IPC_CHANNELS.browserPermissionRevoke, request)
  },
  remoteHosts: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.remoteHostList),
    add: (request) => ipcRenderer.invoke(IPC_CHANNELS.remoteHostAdd, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.remoteHostRemove, request),
    testConnection: (request) => ipcRenderer.invoke(IPC_CHANNELS.remoteHostTestConnection, request)
  },
  remoteSessions: {
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.remoteSessionCreate, request),
    snapshot: (request) => ipcRenderer.invoke(IPC_CHANNELS.remoteSessionSnapshot, request),
    write: (request) => ipcRenderer.invoke(IPC_CHANNELS.remoteSessionWrite, request),
    resize: (request) => ipcRenderer.invoke(IPC_CHANNELS.remoteSessionResize, request),
    terminate: (request) => ipcRenderer.invoke(IPC_CHANNELS.remoteSessionTerminate, request),
    onData: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = remoteSessionDataEventSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.remoteSessionData, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.remoteSessionData, handler)
    },
    onExit: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = remoteSessionExitEventSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.remoteSessionExit, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.remoteSessionExit, handler)
    }
  },
  update: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.updateGetStatus),
    check: () => ipcRenderer.invoke(IPC_CHANNELS.updateCheck)
  },
  learning: {
    listCurricula: () => ipcRenderer.invoke(IPC_CHANNELS.learningListCurricula),
    getCurriculum: (request) => ipcRenderer.invoke(IPC_CHANNELS.learningGetCurriculum, request),
    createUserCurriculum: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.learningCreateUserCurriculum, request),
    updateUserCurriculum: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.learningUpdateUserCurriculum, request),
    deleteUserCurriculum: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.learningDeleteUserCurriculum, request),
    getProgress: () => ipcRenderer.invoke(IPC_CHANNELS.learningGetProgress),
    updateProgress: (request) => ipcRenderer.invoke(IPC_CHANNELS.learningUpdateProgress, request)
  },
  capabilities: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.capabilityList),
    refresh: () => ipcRenderer.invoke(IPC_CHANNELS.capabilityRefresh)
  },
  features: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.featureList)
  },
  applications: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.applicationList),
    upsert: (request) => ipcRenderer.invoke(IPC_CHANNELS.applicationUpsert, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.applicationRemove, request)
  },
  devices: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.deviceList),
    upsert: (request) => ipcRenderer.invoke(IPC_CHANNELS.deviceUpsert, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.deviceRemove, request)
  }
}

// contextIsolation is mandatory (see src/main/security/windowSecurity.ts) so
// every production window reaches this branch; there is intentionally no
// non-isolated fallback.
contextBridge.exposeInMainWorld('ndx', ndx)
