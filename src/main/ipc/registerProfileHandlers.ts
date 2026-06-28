import { ipcMain } from 'electron'
import {
  createProfileRequestSchema,
  IPC_CHANNELS,
  ndxError,
  profileIdRequestSchema,
  startProfileSessionRequestSchema,
  updateProfileRequestSchema,
  type NdxResult,
  type ProfileState,
  type UserProfile
} from '@shared/contracts'
import { ProfileNotFoundError, type ProfileStore } from '../../core/profiles/ProfileStore'

export function registerProfileHandlers(store: ProfileStore): void {
  ipcMain.handle(IPC_CHANNELS.profileStateGet, async (): Promise<NdxResult<ProfileState>> => {
    return { ok: true, data: await store.getState() }
  })

  ipcMain.handle(
    IPC_CHANNELS.profileCreate,
    async (_event, payload: unknown): Promise<NdxResult<UserProfile>> => {
      const parsed = createProfileRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await store.create(parsed.data) }
      } catch (error) {
        return { ok: false, error: toProfileError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.profileUpdate,
    async (_event, payload: unknown): Promise<NdxResult<UserProfile>> => {
      const parsed = updateProfileRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await store.update(parsed.data) }
      } catch (error) {
        return { ok: false, error: toProfileError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.profileDelete,
    async (_event, payload: unknown): Promise<NdxResult<ProfileState>> => {
      const parsed = profileIdRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await store.remove(parsed.data.id) }
      } catch (error) {
        return { ok: false, error: toProfileError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.profileStartSession,
    async (_event, payload: unknown): Promise<NdxResult<ProfileState>> => {
      const parsed = startProfileSessionRequestSchema.safeParse(payload)
      if (!parsed.success) return invalidRequest()
      try {
        return { ok: true, data: await store.startSession(parsed.data) }
      } catch (error) {
        return { ok: false, error: toProfileError(error) }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.profileEndPrivateSession,
    async (): Promise<NdxResult<ProfileState>> => {
      return { ok: true, data: await store.endPrivateSession() }
    }
  )
}

function invalidRequest<T>(): NdxResult<T> {
  return {
    ok: false,
    error: ndxError('validation', 'invalid-request', 'That profile request is invalid.')
  }
}

function toProfileError(error: unknown): ReturnType<typeof ndxError> {
  if (error instanceof ProfileNotFoundError) {
    return ndxError('not-found', 'profile-not-found', error.message)
  }
  const message = error instanceof Error ? error.message : 'Unknown profile error'
  return ndxError('system', 'profile-operation-failed', message, { message })
}
