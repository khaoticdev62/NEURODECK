import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { InvalidLanShareSettingsError, LanShareSettingsStore } from '../LanShareSettingsStore'

describe('LanShareSettingsStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lan-share-settings-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('returns real default ports and an unconfigured group code', async () => {
    const store = new LanShareSettingsStore(
      join(dir, 'settings.json'),
      'Test Device',
      '/home/test/Downloads/NeuroDeck LAN Share'
    )
    const settings = await store.get()
    expect(settings.transferPort).toBe(42000)
    expect(settings.authPort).toBe(42001)
    expect(settings.groupCodeConfigured).toBe(false)
    expect(settings.approvalPolicy).toBe('always-ask')
  })

  it('persists updates across reads', async () => {
    const filePath = join(dir, 'settings.json')
    const store = new LanShareSettingsStore(filePath, 'Test Device', '/dest')
    await store.update({ compressionMode: 'off', autoStartEnabled: true })

    const reopened = new LanShareSettingsStore(filePath, 'Test Device', '/dest')
    const settings = await reopened.get()
    expect(settings.compressionMode).toBe('off')
    expect(settings.autoStartEnabled).toBe(true)
  })

  it('rejects a transfer port equal to the auth port', async () => {
    const store = new LanShareSettingsStore(join(dir, 'settings.json'), 'Test Device', '/dest')
    await expect(store.update({ transferPort: 42001, authPort: 42001 })).rejects.toThrow(
      InvalidLanShareSettingsError
    )
  })

  it('marks the group code as configured without storing plaintext', async () => {
    const store = new LanShareSettingsStore(join(dir, 'settings.json'), 'Test Device', '/dest')
    const settings = await store.markGroupCodeConfigured(true)
    expect(settings.groupCodeConfigured).toBe(true)
    expect(Object.keys(settings)).not.toContain('groupCode')
  })
})
