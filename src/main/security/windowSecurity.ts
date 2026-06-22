import type { BrowserWindow } from 'electron'
import { shell } from 'electron'
import { isAllowedExternalUrl, isAllowedNavigation } from './urlPolicy'

/**
 * Mandatory Electron BrowserWindow hardening per NDX_SECURITY_ARCHITECTURE.md.
 * Every production window must be constructed with these webPreferences.
 */
export const HARDENED_WEB_PREFERENCES = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false
} as const

/**
 * Denies in-app navigation to anything other than the app's own dev/prod origin,
 * and routes external links through an allowlisted shell.openExternal call instead
 * of letting the renderer open arbitrary windows or protocols.
 */
export function applyNavigationPolicy(
  window: BrowserWindow,
  allowedOrigins: readonly string[]
): void {
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowedNavigation(navigationUrl, allowedOrigins)) {
      event.preventDefault()
    }
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}
