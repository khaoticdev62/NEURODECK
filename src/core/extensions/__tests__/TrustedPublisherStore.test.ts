import { generateKeyPairSync } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TrustedPublisherStore } from '../TrustedPublisherStore'
import { fingerprintPublicKey } from '../ManifestSignature'

describe('TrustedPublisherStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'trusted-publisher-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('adds a real publisher keyed by its real public-key fingerprint', async () => {
    const { publicKey } = generateKeyPairSync('ed25519')
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const store = new TrustedPublisherStore(join(dir, 'publishers.json'))

    const added = await store.add(publicKeyPem, 'Demo Publisher')

    expect(added.fingerprint).toBe(fingerprintPublicKey(publicKeyPem))
    expect(added.revoked).toBe(false)
    expect(await store.get(added.fingerprint)).toEqual(added)
  })

  it('revokes and unrevokes a real publisher without losing its key', async () => {
    const { publicKey } = generateKeyPairSync('ed25519')
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const store = new TrustedPublisherStore(join(dir, 'publishers.json'))
    const added = await store.add(publicKeyPem, 'Demo Publisher')

    const revoked = await store.setRevoked(added.fingerprint, true)
    expect(revoked.revoked).toBe(true)
    expect(revoked.publicKeyPem).toBe(publicKeyPem)

    const unrevoked = await store.setRevoked(added.fingerprint, false)
    expect(unrevoked.revoked).toBe(false)
  })
})
