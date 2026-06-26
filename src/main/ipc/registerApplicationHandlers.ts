import { dialog, ipcMain, type BrowserWindow } from 'electron'
import {
  applicationIdRequestSchema,
  discoverApplicationsRequestSchema,
  IPC_CHANNELS,
  launchApplicationRequestSchema,
  ndxError,
  upsertApplicationRequestSchema,
  type ApplicationRecord,
  type LaunchResult,
  type NdxResult
} from '@shared/contracts'
import { buildAppImageRecord, verifyAppImage } from '../../core/applications/AppImageVerifier'
import type { ApplicationDiscoveryService } from '../../core/applications/ApplicationDiscoveryService'
import type { ApplicationLauncher } from '../../core/applications/ApplicationLauncher'
import type { ApplicationStore } from '../../core/applications/ApplicationStore'

/**
 * Real Epic X1/X2 Application Registry + ecosystem IPC (supplemental
 * spec §6). CRUD is X1; `discover`/`launch`/`registerAppImage` are X2's
 * real discovery, launch, and user-registered-AppImage actions.
 */
export function registerApplicationHandlers(
  store: ApplicationStore,
  discoveryService: ApplicationDiscoveryService,
  launcher: ApplicationLauncher,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle(
    IPC_CHANNELS.applicationList,
    async (): Promise<NdxResult<ApplicationRecord[]>> => {
      return { ok: true, data: await store.list() }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.applicationUpsert,
    async (_event, payload: unknown): Promise<NdxResult<ApplicationRecord>> => {
      const parsed = upsertApplicationRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That application record is invalid.')
        }
      }
      return { ok: true, data: await store.upsert(parsed.data) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.applicationRemove,
    async (_event, payload: unknown): Promise<NdxResult<null>> => {
      const parsed = applicationIdRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That application id is invalid.')
        }
      }
      await store.remove(parsed.data.id)
      return { ok: true, data: null }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.applicationDiscover,
    async (_event, payload: unknown): Promise<NdxResult<ApplicationRecord[]>> => {
      const parsed = discoverApplicationsRequestSchema.safeParse(payload ?? {})
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That discovery request is invalid.')
        }
      }
      return { ok: true, data: await discoveryService.discover(parsed.data.sources) }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.applicationLaunch,
    async (_event, payload: unknown): Promise<NdxResult<LaunchResult>> => {
      const parsed = launchApplicationRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-request', 'That launch request is invalid.')
        }
      }
      const record = await store.get(parsed.data.id)
      if (!record) {
        return {
          ok: false,
          error: ndxError(
            'not-found',
            'application-not-found',
            'That application no longer exists.'
          )
        }
      }
      const result = await launcher.launch(record)
      if (result.launched) {
        await store.upsert({ ...record, lastLaunchedAt: Date.now() })
      }
      return { ok: true, data: result }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.applicationRegisterAppImage,
    async (): Promise<NdxResult<ApplicationRecord | null>> => {
      const window = getWindow()
      const result = window
        ? await dialog.showOpenDialog(window, {
            properties: ['openFile'],
            filters: [{ name: 'AppImage', extensions: ['AppImage', 'appimage'] }]
          })
        : await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'AppImage', extensions: ['AppImage', 'appimage'] }]
          })
      if (result.canceled || result.filePaths.length === 0) {
        return { ok: true, data: null }
      }
      const path = result.filePaths[0]
      const verification = await verifyAppImage(path)
      if (!verification.valid) {
        return {
          ok: false,
          error: ndxError('validation', 'invalid-appimage', verification.reason)
        }
      }
      const record = await store.upsert(buildAppImageRecord(path, verification.sizeBytes))
      return { ok: true, data: record }
    }
  )
}
