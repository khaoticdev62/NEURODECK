import { contextBridge, ipcRenderer } from 'electron'
import {
  agentRunSchema,
  agentToolExecutionRequestSchema,
  browserPermissionRequestSchema,
  browserTabSchema,
  extensionHealthEventSchema,
  IPC_CHANNELS,
  lanShareServiceStatusSchema,
  lanShareTransferJobSchema,
  peerDeviceSchema,
  powerStateEventSchema,
  remoteSessionDataEventSchema,
  remoteSessionExitEventSchema,
  terminalDataEventSchema,
  terminalExitEventSchema,
  transactionRecordSchema,
  transferJobSchema,
  type NdxBridge
} from '../shared/contracts'
import { z } from 'zod'

const transactionRecordListSchema = z.array(transactionRecordSchema)
const peerDeviceListSchema = z.array(peerDeviceSchema)
const transferJobListSchema = z.array(transferJobSchema)
const lanShareTransferJobListSchema = z.array(lanShareTransferJobSchema)

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
  backups: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.backupList),
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.backupCreate, request),
    verify: (request) => ipcRenderer.invoke(IPC_CHANNELS.backupVerify, request),
    restore: (request) => ipcRenderer.invoke(IPC_CHANNELS.backupRestore, request),
    importLocal: () => ipcRenderer.invoke(IPC_CHANNELS.backupImportLocal),
    migrate: () => ipcRenderer.invoke(IPC_CHANNELS.backupMigrate)
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
    get: () => ipcRenderer.invoke(IPC_CHANNELS.diagnosticsGet),
    createSupportBundle: () => ipcRenderer.invoke(IPC_CHANNELS.diagnosticsCreateSupportBundle),
    listCrashReports: () => ipcRenderer.invoke(IPC_CHANNELS.diagnosticsListCrashReports),
    recordRendererCrashReport: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.diagnosticsRecordRendererCrashReport, request)
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
  vault: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.vaultList),
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.vaultCreate, request),
    update: (request) => ipcRenderer.invoke(IPC_CHANNELS.vaultUpdate, request),
    rotate: (request) => ipcRenderer.invoke(IPC_CHANNELS.vaultRotate, request),
    reveal: (request) => ipcRenderer.invoke(IPC_CHANNELS.vaultReveal, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.vaultDelete, request),
    listAccessLog: () => ipcRenderer.invoke(IPC_CHANNELS.vaultAccessLog)
  },
  profiles: {
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.profileStateGet),
    create: (request) => ipcRenderer.invoke(IPC_CHANNELS.profileCreate, request),
    update: (request) => ipcRenderer.invoke(IPC_CHANNELS.profileUpdate, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.profileDelete, request),
    startSession: (request) => ipcRenderer.invoke(IPC_CHANNELS.profileStartSession, request),
    endPrivateSession: () => ipcRenderer.invoke(IPC_CHANNELS.profileEndPrivateSession)
  },
  continuity: {
    getState: () => ipcRenderer.invoke(IPC_CHANNELS.continuityStateGet),
    setSafeMode: (request) => ipcRenderer.invoke(IPC_CHANNELS.continuitySafeModeSet, request),
    recordPowerEvent: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.continuityPowerEventRecord, request),
    saveSessionSnapshot: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.continuitySessionSnapshotSave, request)
  },
  privacy: {
    getDataMap: () => ipcRenderer.invoke(IPC_CHANNELS.privacyDataMapGet),
    clearDataCategory: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.privacyDataCategoryClear, request)
  },
  troubleshooter: {
    runCheck: (request) => ipcRenderer.invoke(IPC_CHANNELS.troubleshooterRunCheck, request)
  },
  screenshot: {
    capture: (request) => ipcRenderer.invoke(IPC_CHANNELS.screenshotCapture, request),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.screenshotList),
    copyToClipboard: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.screenshotCopyToClipboard, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.screenshotDelete, request),
    addToWorkspace: (request) => ipcRenderer.invoke(IPC_CHANNELS.screenshotAddToWorkspace, request)
  },
  presentationMode: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.presentationModeGet),
    set: (request) => ipcRenderer.invoke(IPC_CHANNELS.presentationModeSet, request)
  },
  notificationPolicy: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.notificationPolicyGet),
    set: (request) => ipcRenderer.invoke(IPC_CHANNELS.notificationPolicySet, request)
  },
  recording: {
    listSources: () => ipcRenderer.invoke(IPC_CHANNELS.recordingListSources),
    begin: (request) => ipcRenderer.invoke(IPC_CHANNELS.recordingBegin, request),
    appendChunk: (request) => ipcRenderer.invoke(IPC_CHANNELS.recordingAppendChunk, request),
    finish: (request) => ipcRenderer.invoke(IPC_CHANNELS.recordingFinish, request),
    cancel: (request) => ipcRenderer.invoke(IPC_CHANNELS.recordingCancel, request),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.recordingList),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.recordingDelete, request)
  },
  applicationPolicy: {
    get: (request) => ipcRenderer.invoke(IPC_CHANNELS.applicationPolicyGet, request),
    set: (request) => ipcRenderer.invoke(IPC_CHANNELS.applicationPolicySet, request)
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
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.applicationRemove, request),
    discover: (request) => ipcRenderer.invoke(IPC_CHANNELS.applicationDiscover, request),
    launch: (request) => ipcRenderer.invoke(IPC_CHANNELS.applicationLaunch, request),
    registerAppImage: () => ipcRenderer.invoke(IPC_CHANNELS.applicationRegisterAppImage)
  },
  devices: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.deviceList),
    inventory: () => ipcRenderer.invoke(IPC_CHANNELS.deviceInventory),
    upsert: (request) => ipcRenderer.invoke(IPC_CHANNELS.deviceUpsert, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.deviceRemove, request)
  },
  packages: {
    flatpakSearch: (request) => ipcRenderer.invoke(IPC_CHANNELS.packageFlatpakSearch, request),
    flatpakPermissions: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.packageFlatpakPermissions, request),
    flatpakInstall: (request) => ipcRenderer.invoke(IPC_CHANNELS.packageFlatpakInstall, request),
    flatpakUpdate: (request) => ipcRenderer.invoke(IPC_CHANNELS.packageFlatpakUpdate, request),
    flatpakUninstall: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.packageFlatpakUninstall, request),
    listTransactions: () => ipcRenderer.invoke(IPC_CHANNELS.packageTransactionList),
    cancelTransaction: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.packageTransactionCancel, request),
    onTransactionUpdate: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = transactionRecordListSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.packageTransactionUpdate, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.packageTransactionUpdate, handler)
    }
  },
  extensions: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.extensionList),
    previewInstall: (request) => ipcRenderer.invoke(IPC_CHANNELS.extensionPreviewInstall, request),
    install: (request) => ipcRenderer.invoke(IPC_CHANNELS.extensionInstall, request),
    setEnabled: (request) => ipcRenderer.invoke(IPC_CHANNELS.extensionSetEnabled, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.extensionRemove, request),
    clearQuarantine: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.extensionClearQuarantine, request),
    onHealthEvent: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = extensionHealthEventSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.extensionHealthEvent, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.extensionHealthEvent, handler)
    }
  },
  knowledge: {
    listSources: () => ipcRenderer.invoke(IPC_CHANNELS.knowledgeSourceList),
    addSource: (request) => ipcRenderer.invoke(IPC_CHANNELS.knowledgeSourceAdd, request),
    removeSource: (request) => ipcRenderer.invoke(IPC_CHANNELS.knowledgeSourceRemove, request),
    reindexSource: (request) => ipcRenderer.invoke(IPC_CHANNELS.knowledgeSourceReindex, request),
    setSourcePaused: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.knowledgeSourceSetPaused, request),
    query: (request) => ipcRenderer.invoke(IPC_CHANNELS.knowledgeQuery, request)
  },
  memory: {
    list: (request) => ipcRenderer.invoke(IPC_CHANNELS.memoryList, request),
    write: (request) => ipcRenderer.invoke(IPC_CHANNELS.memoryWrite, request),
    update: (request) => ipcRenderer.invoke(IPC_CHANNELS.memoryUpdate, request),
    delete: (request) => ipcRenderer.invoke(IPC_CHANNELS.memoryDelete, request),
    setDisabled: (request) => ipcRenderer.invoke(IPC_CHANNELS.memorySetDisabled, request),
    clearScope: (request) => ipcRenderer.invoke(IPC_CHANNELS.memoryClearScope, request),
    export: (request) => ipcRenderer.invoke(IPC_CHANNELS.memoryExport, request)
  },
  promptLibrary: {
    listTemplates: () => ipcRenderer.invoke(IPC_CHANNELS.promptTemplateList),
    upsertTemplate: (request) => ipcRenderer.invoke(IPC_CHANNELS.promptTemplateUpsert, request),
    removeTemplate: (request) => ipcRenderer.invoke(IPC_CHANNELS.promptTemplateRemove, request),
    listPersonas: () => ipcRenderer.invoke(IPC_CHANNELS.personaList),
    upsertPersona: (request) => ipcRenderer.invoke(IPC_CHANNELS.personaUpsert, request),
    removePersona: (request) => ipcRenderer.invoke(IPC_CHANNELS.personaRemove, request)
  },
  voice: {
    getMicrophoneStatus: () => ipcRenderer.invoke(IPC_CHANNELS.microphoneGetStatus),
    setMicrophoneGranted: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.microphoneSetGranted, request),
    listVoiceNotes: () => ipcRenderer.invoke(IPC_CHANNELS.voiceNoteList),
    saveVoiceNote: (request) => ipcRenderer.invoke(IPC_CHANNELS.voiceNoteSave, request),
    removeVoiceNote: (request) => ipcRenderer.invoke(IPC_CHANNELS.voiceNoteRemove, request),
    deleteVoiceNoteAudio: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.voiceNoteDeleteAudio, request),
    addVoiceNoteToKnowledge: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.voiceNoteAddToKnowledge, request),
    intakeDocument: (request) => ipcRenderer.invoke(IPC_CHANNELS.documentIntake, request)
  },
  clipboard: {
    list: (request) => ipcRenderer.invoke(IPC_CHANNELS.clipboardList, request),
    setPinned: (request) => ipcRenderer.invoke(IPC_CHANNELS.clipboardSetPinned, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.clipboardRemove, request),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.clipboardClear),
    setMonitoring: (request) => ipcRenderer.invoke(IPC_CHANNELS.clipboardSetMonitoring, request)
  },
  snippets: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.snippetList),
    upsert: (request) => ipcRenderer.invoke(IPC_CHANNELS.snippetUpsert, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.snippetRemove, request),
    render: (request) => ipcRenderer.invoke(IPC_CHANNELS.snippetRender, request)
  },
  peers: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.peerList),
    addManual: (request) => ipcRenderer.invoke(IPC_CHANNELS.peerAddManual, request),
    remove: (request) => ipcRenderer.invoke(IPC_CHANNELS.peerRemove, request),
    setTrust: (request) => ipcRenderer.invoke(IPC_CHANNELS.peerSetTrust, request),
    sendFile: (request) => ipcRenderer.invoke(IPC_CHANNELS.peerSendFile, request),
    onUpdate: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = peerDeviceListSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.peerUpdate, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.peerUpdate, handler)
    }
  },
  transferJobs: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.transferJobList),
    cancel: (request) => ipcRenderer.invoke(IPC_CHANNELS.transferJobCancel, request),
    onUpdate: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = transferJobListSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.transferJobUpdate, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.transferJobUpdate, handler)
    }
  },
  lanShare: {
    getIdentity: () => ipcRenderer.invoke(IPC_CHANNELS.lanShareIdentityGet),
    getServiceStatus: () => ipcRenderer.invoke(IPC_CHANNELS.lanShareServiceStatus),
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.lanShareSettingsGet),
    updateSettings: (request) => ipcRenderer.invoke(IPC_CHANNELS.lanShareSettingsUpdate, request),
    setGroupCode: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.lanShareSettingsSetGroupCode, request),
    listPeers: () => ipcRenderer.invoke(IPC_CHANNELS.lanSharePeerList),
    addManualPeer: (request) => ipcRenderer.invoke(IPC_CHANNELS.lanSharePeerAddManual, request),
    removePeer: (request) => ipcRenderer.invoke(IPC_CHANNELS.lanSharePeerRemove, request),
    setPeerTrust: (request) => ipcRenderer.invoke(IPC_CHANNELS.lanSharePeerSetTrust, request),
    listTransferJobs: () => ipcRenderer.invoke(IPC_CHANNELS.lanShareTransferList),
    cancelTransferJob: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.lanShareTransferCancel, request),
    onTransferJobUpdate: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = lanShareTransferJobListSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.lanShareTransferUpdate, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.lanShareTransferUpdate, handler)
    },
    startService: () => ipcRenderer.invoke(IPC_CHANNELS.lanShareServiceStart),
    stopService: () => ipcRenderer.invoke(IPC_CHANNELS.lanShareServiceStop),
    onServiceUpdate: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
        const parsed = lanShareServiceStatusSchema.safeParse(payload)
        if (parsed.success) listener(parsed.data)
      }
      ipcRenderer.on(IPC_CHANNELS.lanShareServiceUpdate, handler)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.lanShareServiceUpdate, handler)
    },
    listInterfaces: () => ipcRenderer.invoke(IPC_CHANNELS.lanShareInterfaceList),
    getHealth: () => ipcRenderer.invoke(IPC_CHANNELS.lanShareHealthGet),
    sendFiles: (request) => ipcRenderer.invoke(IPC_CHANNELS.lanShareSendFiles, request),
    acceptTransfer: (request) => ipcRenderer.invoke(IPC_CHANNELS.lanShareAcceptTransfer, request),
    rejectTransfer: (request) => ipcRenderer.invoke(IPC_CHANNELS.lanShareRejectTransfer, request),
    pickFiles: () => ipcRenderer.invoke(IPC_CHANNELS.lanSharePickFiles)
  }
}

// contextIsolation is mandatory (see src/main/security/windowSecurity.ts) so
// every production window reaches this branch; there is intentionally no
// non-isolated fallback.
contextBridge.exposeInMainWorld('ndx', ndx)
