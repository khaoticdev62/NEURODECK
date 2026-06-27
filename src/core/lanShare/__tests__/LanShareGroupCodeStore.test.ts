import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SecretCipher } from '../../models/SecretCipher'
import { DEFAULT_LAN_SHARE_GROUP_CODE, LanShareGroupCodeStore } from '../LanShareGroupCodeStore'

function fakeCipher(available = true): SecretCipher {
  return {
    isAvailable: () => available,
    encrypt: (plaintext) => `ENC(${plaintext})`,
    decrypt: (ciphertext) => ciphertext.replace(/^ENC\(/, '').replace(/\)$/, '')
  }
}

describe('LanShareGroupCodeStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lan-share-group-code-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('returns the real Warpinator default before any code is set', async () => {
    const store = new LanShareGroupCodeStore(join(dir, 'code.json'), fakeCipher())
    expect(await store.get()).toBe(DEFAULT_LAN_SHARE_GROUP_CODE)
    expect(await store.isSecureMode()).toBe(false)
  })

  it('persists a real custom code encrypted at rest and reports secure mode', async () => {
    const filePath = join(dir, 'code.json')
    const store = new LanShareGroupCodeStore(filePath, fakeCipher())
    await store.set('my-real-secret-code')

    const reopened = new LanShareGroupCodeStore(filePath, fakeCipher())
    expect(await reopened.get()).toBe('my-real-secret-code')
    expect(await reopened.isSecureMode()).toBe(true)
  })

  it('falls back to honest plaintext when the cipher is unavailable', async () => {
    const store = new LanShareGroupCodeStore(join(dir, 'code.json'), fakeCipher(false))
    await store.set('plaintext-fallback-code')
    expect(await store.get()).toBe('plaintext-fallback-code')
  })

  it('reverts to the default after clear()', async () => {
    const store = new LanShareGroupCodeStore(join(dir, 'code.json'), fakeCipher())
    await store.set('temporary-code')
    await store.clear()
    expect(await store.get()).toBe(DEFAULT_LAN_SHARE_GROUP_CODE)
  })
})
