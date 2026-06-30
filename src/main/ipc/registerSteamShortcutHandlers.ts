import { ipcMain } from 'electron'
import {
  createSteamShortcutRequestSchema,
  IPC_CHANNELS,
  ndxError,
  removeSteamShortcutRequestSchema,
  restoreSteamShortcutBackupRequestSchema,
  selectSteamProfileRequestSchema,
  updateSteamShortcutRequestSchema,
  type NdxResult,
  type SteamRunningState,
  type SteamShortcutBackup,
  type SteamShortcutEntry,
  type SteamUserProfile
} from '@shared/contracts'
import { discoverShortcutsVdfPaths } from '../../core/steam/SteamUserdataPaths'
import { SteamShortcutService } from '../../core/steam/SteamShortcutService'

/**
 * Real Steam Shortcut Manager IPC. A `SteamShortcutService` is
 * created per real `vdfPath` rather than once globally — a machine
 * can have multiple real Steam user profiles, each with its own
 * `shortcuts.vdf`, and every request names which one it targets
 * explicitly rather than this layer silently assuming "the" profile.
 * Instances are cached per path so repeated calls for the same
 * profile reuse one service (and its backup bookkeeping), not a
 * fresh one each time.
 */
export function registerSteamShortcutHandlers(steamRoot: string, backupBaseDir: string): void {
  const services = new Map<string, SteamShortcutService>()
  function serviceFor(vdfPath: string): SteamShortcutService {
    let service = services.get(vdfPath)
    if (!service) {
      const backupDir = `${backupBaseDir}-${hashPath(vdfPath)}`
      service = new SteamShortcutService(vdfPath, backupDir)
      services.set(vdfPath, service)
    }
    return service
  }

  ipcMain.handle(
    IPC_CHANNELS.steamShortcutListProfiles,
    async (): Promise<NdxResult<SteamUserProfile[]>> => {
      const paths = await discoverShortcutsVdfPaths(steamRoot)
      const profiles = paths.map((vdfPath) => ({
        userId: extractUserId(vdfPath),
        vdfPath
      }))
      return { ok: true, data: profiles }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.steamShortcutList,
    async (_event, payload: unknown): Promise<NdxResult<SteamShortcutEntry[]>> => {
      const parsed = selectSteamProfileRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await serviceFor(parsed.data.vdfPath).list() }
      } catch (error) {
        return { ok: false, error: toSteamError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.steamShortcutCheckRunning,
    async (_event, payload: unknown): Promise<NdxResult<SteamRunningState>> => {
      const parsed = selectSteamProfileRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await serviceFor(parsed.data.vdfPath).checkSteamRunning() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.steamShortcutCreate,
    async (_event, payload: unknown): Promise<NdxResult<SteamShortcutEntry[]>> => {
      const parsed = createSteamShortcutRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        const data = await serviceFor(parsed.data.vdfPath).create({
          appName: parsed.data.appName,
          exe: parsed.data.exe,
          startDir: parsed.data.startDir,
          launchOptions: parsed.data.launchOptions
        })
        return { ok: true, data }
      } catch (error) {
        return { ok: false, error: toSteamError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.steamShortcutUpdate,
    async (_event, payload: unknown): Promise<NdxResult<SteamShortcutEntry[]>> => {
      const parsed = updateSteamShortcutRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        const data = await serviceFor(parsed.data.vdfPath).update(
          parsed.data.index,
          parsed.data.patch
        )
        return { ok: true, data }
      } catch (error) {
        return { ok: false, error: toSteamError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.steamShortcutRemove,
    async (_event, payload: unknown): Promise<NdxResult<SteamShortcutEntry[]>> => {
      const parsed = removeSteamShortcutRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        const data = await serviceFor(parsed.data.vdfPath).remove(parsed.data.index)
        return { ok: true, data }
      } catch (error) {
        return { ok: false, error: toSteamError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.steamShortcutListBackups,
    async (_event, payload: unknown): Promise<NdxResult<SteamShortcutBackup[]>> => {
      const parsed = selectSteamProfileRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      return { ok: true, data: await serviceFor(parsed.data.vdfPath).listBackups() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.steamShortcutRestoreBackup,
    async (_event, payload: unknown): Promise<NdxResult<SteamShortcutEntry[]>> => {
      const parsed = restoreSteamShortcutBackupRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        const data = await serviceFor(parsed.data.vdfPath).restoreFromBackup(parsed.data.fileName)
        return { ok: true, data }
      } catch (error) {
        return { ok: false, error: toSteamError(error) }
      }
    }
  )
}

function extractUserId(vdfPath: string): string {
  const segments = vdfPath.split(/[/\\]/)
  const userdataIndex = segments.indexOf('userdata')
  return userdataIndex >= 0 ? (segments[userdataIndex + 1] ?? 'unknown') : 'unknown'
}

/** Stable, filesystem-safe per-profile backup directory suffix — avoids colliding two different Steam user profiles' backup history together. */
function hashPath(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That Steam shortcut request is invalid.')
  }
}

function toSteamError(error: unknown): ReturnType<typeof ndxError> {
  return ndxError(
    'system',
    'steam-shortcut-error',
    error instanceof Error ? error.message : 'A Steam shortcut operation failed.'
  )
}
