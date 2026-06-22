import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer. Kept empty until Epic 4 (typed IPC/tool contracts)
// defines the narrow, schema-validated surface real features will use.
const api = {}

// contextIsolation is mandatory (see src/main/security/windowSecurity.ts) so
// every production window reaches this branch; there is intentionally no
// non-isolated fallback.
contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('api', api)
