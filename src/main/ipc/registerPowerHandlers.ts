import { app, ipcMain, powerMonitor, type BrowserWindow } from 'electron'
import { IPC_CHANNELS, type NdxResult, type PowerStateEvent } from '@shared/contracts'

type PowerMonitorEventType = PowerStateEvent['type']

/**
 * Real ND-051 Power Menu actions, scoped to what's safe to automate: real
 * Electron app-lifecycle calls only. Real OS-level suspend/reboot/shutdown
 * are deliberately not wired here — those are irreversible actions against
 * the host machine itself, not just the app, and need their own explicit
 * native-integration design and sign-off before this slice would attempt
 * them. See the ledger for the full list of deferred Power Menu options.
 *
 * Suspend/resume (mega-prompt §31 "Resume after suspend") is real, scoped to
 * detection and notification: Electron's real `powerMonitor` events are
 * forwarded to the renderer so the shell can tell the user the system
 * suspended/resumed/locked/unlocked and refresh anything that may have gone
 * stale across a suspend (e.g. terminal sessions, system metrics). There is
 * no separate core-service process to pause/resume here, and this app does
 * not attempt to veto or delay the OS's own suspend decision.
 */
export function registerPowerHandlers(getWindow: () => BrowserWindow | null): () => void {
  ipcMain.handle(IPC_CHANNELS.powerRestartApp, (): NdxResult<null> => {
    app.relaunch()
    app.exit(0)
    return { ok: true, data: null }
  })

  ipcMain.handle(IPC_CHANNELS.powerQuitApp, (): NdxResult<null> => {
    app.quit()
    return { ok: true, data: null }
  })

  function notify(type: PowerMonitorEventType): void {
    const window = getWindow()
    if (!window || window.webContents.isDestroyed()) return
    const event: PowerStateEvent = { type, timestamp: Date.now() }
    window.webContents.send(IPC_CHANNELS.powerStateEvent, event)
  }

  const onSuspend = (): void => notify('suspend')
  const onResume = (): void => notify('resume')
  const onLockScreen = (): void => notify('lock-screen')
  const onUnlockScreen = (): void => notify('unlock-screen')

  powerMonitor.on('suspend', onSuspend)
  powerMonitor.on('resume', onResume)
  powerMonitor.on('lock-screen', onLockScreen)
  powerMonitor.on('unlock-screen', onUnlockScreen)

  return () => {
    powerMonitor.removeListener('suspend', onSuspend)
    powerMonitor.removeListener('resume', onResume)
    powerMonitor.removeListener('lock-screen', onLockScreen)
    powerMonitor.removeListener('unlock-screen', onUnlockScreen)
  }
}
