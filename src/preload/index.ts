import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type NdxBridge } from '../shared/contracts'

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
    read: (request) => ipcRenderer.invoke(IPC_CHANNELS.fileRead, request)
  }
}

// contextIsolation is mandatory (see src/main/security/windowSecurity.ts) so
// every production window reaches this branch; there is intentionally no
// non-isolated fallback.
contextBridge.exposeInMainWorld('ndx', ndx)
