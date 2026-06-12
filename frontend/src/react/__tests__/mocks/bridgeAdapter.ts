/**
 * Auto-mock for neurodeckApi — replaces all bridge I/O with vi.fn() stubs.
 * Import this at the top of any test that renders components that call the bridge.
 *
 * Usage:
 *   vi.mock('../../services/bridgeAdapter', () => import('../mocks/bridgeAdapter'));
 */
import { vi } from 'vitest';

const fn = () => vi.fn().mockResolvedValue(undefined);

export const neurodeckApi = {
  store: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue({ ok: true }),
    reset: vi.fn().mockResolvedValue({ ok: true }),
  },
  ai: {
    chat: fn(),
    chatStream: fn(),
    health: fn().mockResolvedValue([]),
    setProvider: fn(),
    setModel: fn(),
  },
  agents: {
    list: fn(),
    run: fn(),
    stop: fn(),
  },
  models: {
    detectLocal: fn().mockResolvedValue({ ok: true, detection: { scannedAt: '', runtimes: [], discoveredModels: [], summary: '' } }),
    listProviderRuntimes: fn(),
    discoverInstalledModels: fn(),
    getProviderHealth: fn(),
    runModelProbe: fn(),
    getCompatibilityScores: fn(),
    pickBestLocalModel: fn(),
    getAgentModelPolicies: fn(),
    getAllowedModelsForAgent: fn(),
    validateAgentModel: fn(),
    evaluateRecovery: fn(),
    recordRecoveryEvent: fn(),
    getRecoveryEventLog: fn(),
  },
  git: {
    status: fn(),
    diff: fn(),
    commit: fn(),
    push: fn(),
    pull: fn(),
    log: fn(),
    branches: fn(),
    checkout: fn(),
  },
  ide: {
    listFiles: fn(),
    readFile: fn(),
    saveFile: fn(),
    renameFile: fn(),
  },
  terminal: {
    spawn: fn(),
    kill: fn(),
    write: fn(),
    resize: fn(),
  },
  browser: {
    open: fn(),
    navigate: fn(),
    close: fn(),
    evaluate: fn(),
    click: fn(),
    fill: fn(),
    getCitation: fn(),
    saveToMemory: fn(),
  },
  plugins: {
    list: fn(),
    install: fn(),
    uninstall: fn(),
    reload: fn(),
    toggle: fn(),
  },
  scheduler: {
    list: fn(),
    create: fn(),
    toggle: fn(),
    delete: fn(),
    runNow: fn(),
  },
  memory: {
    list: fn(),
    add: fn(),
    delete: fn(),
    pin: fn(),
    search: fn(),
  },
  apiLab: {
    sendRequest: fn(),
    listPresets: fn(),
    savePreset: fn(),
    deletePreset: fn(),
  },
  diagnostics: {
    get: fn(),
    logs: fn(),
    run: fn(),
    generateBundle: fn(),
    getHealth: fn(),
    exportBundle: fn(),
  },
  sessions: {
    list: fn(),
    delete: fn(),
    rename: fn(),
    exportMarkdown: fn(),
    exportContent: fn(),
    save: fn(),
    listMeta: fn(),
  },
  system: {
    getStats: fn(),
    getInfo: fn(),
  },
  transfer: {
    discoverPeers: fn(),
    send: fn(),
    receive: fn(),
  },
  torrent: {
    add: fn(),
    remove: fn(),
    list: fn(),
    pause: fn(),
    resume: fn(),
  },
  tunnel: {
    start: fn(),
    stop: fn(),
    status: fn(),
  },
  remote: {
    startServer: fn(),
    stopServer: fn(),
    getStatus: fn(),
    getUrl: fn(),
  },
  security: {
    getReport: fn(),
  },
  lsp: {
    start: fn(),
    stop: fn(),
    getDiagnostics: fn(),
  },
  ollama: {
    pull: fn(),
    list: fn(),
    delete: fn(),
  },
  hf: {
    listModels: fn(),
    downloadModel: fn(),
    deleteModel: fn(),
  },
  orchestrator: {
    run: fn(),
    list: fn(),
  },
  workflow: {
    list: fn(),
    run: fn(),
    create: fn(),
    delete: fn(),
  },
  canvas: {
    startCollab: fn(),
    joinCollab: fn(),
    stopCollab: fn(),
  },
  config: {
    get: fn(),
    set: fn(),
    themes: fn(),
    personas: fn(),
  },
  cliMaker: {
    list: fn(),
    create: fn(),
    update: fn(),
    delete: fn(),
    run: fn(),
    exportLua: fn(),
    saveAsPlugin: fn(),
    exportScript: fn(),
    importLua: fn(),
  },
  projects: {
    selectAndScan: fn(),
    buildContext: fn(),
  },
};

export const listenBridge = vi.fn().mockReturnValue(() => {});
