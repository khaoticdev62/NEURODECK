import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LockPinMismatchError, LockSettingsStore } from '../LockSettingsStore'

let dir: string
let store: LockSettingsStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-lock-settings-'))
  store = new LockSettingsStore(join(dir, 'lock-settings.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('LockSettingsStore', () => {
  it('starts with no PIN configured', async () => {
    expect(await store.getStatus()).toEqual({ enabled: false })
    expect(await store.verifyPin('1234')).toBe(false)
  })

  it('sets a PIN for the first time without requiring a current PIN', async () => {
    expect(await store.setPin('1234')).toEqual({ enabled: true })
    expect(await store.verifyPin('1234')).toBe(true)
    expect(await store.verifyPin('9999')).toBe(false)
  })

  it('requires the correct current PIN to change an existing PIN', async () => {
    await store.setPin('1234')

    await expect(store.setPin('5678', '0000')).rejects.toBeInstanceOf(LockPinMismatchError)
    expect(await store.verifyPin('1234')).toBe(true)

    await store.setPin('5678', '1234')
    expect(await store.verifyPin('5678')).toBe(true)
    expect(await store.verifyPin('1234')).toBe(false)
  })

  it('requires the correct current PIN to remove it', async () => {
    await store.setPin('1234')

    await expect(store.removePin('0000')).rejects.toBeInstanceOf(LockPinMismatchError)
    expect((await store.getStatus()).enabled).toBe(true)

    expect(await store.removePin('1234')).toEqual({ enabled: false })
    expect(await store.verifyPin('1234')).toBe(false)
  })

  it('never stores the raw PIN on disk', async () => {
    await store.setPin('1234')
    const raw = await import('node:fs/promises').then((fs) =>
      fs.readFile(join(dir, 'lock-settings.json'), 'utf-8')
    )
    expect(raw).not.toContain('1234')
  })

  it('persists across store instances over the same file', async () => {
    await store.setPin('1234')
    const reopened = new LockSettingsStore(join(dir, 'lock-settings.json'))
    expect(await reopened.verifyPin('1234')).toBe(true)
  })
})
