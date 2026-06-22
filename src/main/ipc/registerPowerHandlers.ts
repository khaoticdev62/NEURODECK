import { app, ipcMain } from 'electron'
import { IPC_CHANNELS, type NdxResult } from '@shared/contracts'

/**
 * Real ND-051 Power Menu actions, scoped to what's safe to automate: real
 * Electron app-lifecycle calls only. Real OS-level suspend/reboot/shutdown
 * are deliberately not wired here — those are irreversible actions against
 * the host machine itself, not just the app, and need their own explicit
 * native-integration design and sign-off before this slice would attempt
 * them. See the ledger for the full list of deferred Power Menu options.
 */
export function registerPowerHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.powerRestartApp, (): NdxResult<null> => {
    app.relaunch()
    app.exit(0)
    return { ok: true, data: null }
  })

  ipcMain.handle(IPC_CHANNELS.powerQuitApp, (): NdxResult<null> => {
    app.quit()
    return { ok: true, data: null }
  })
}
