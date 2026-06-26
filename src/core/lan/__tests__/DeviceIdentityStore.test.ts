import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DeviceIdentityStore } from '../DeviceIdentityStore'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-device-identity-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('DeviceIdentityStore', () => {
  it('generates a real Ed25519 keypair and a real SHA-256 fingerprint on first use', async () => {
    const store = new DeviceIdentityStore(join(dir, 'identity.json'))
    const identity = await store.get()

    expect(identity.publicKeyPem).toContain('BEGIN PUBLIC KEY')
    expect(identity.privateKeyPem).toContain('BEGIN PRIVATE KEY')
    expect(identity.fingerprint).toHaveLength(64)
  })

  it('persists the same real identity across instances rather than regenerating it', async () => {
    const filePath = join(dir, 'identity.json')
    const first = await new DeviceIdentityStore(filePath).get()
    const second = await new DeviceIdentityStore(filePath).get()

    expect(second.id).toBe(first.id)
    expect(second.fingerprint).toBe(first.fingerprint)
  })

  it('generates distinct identities for two different files', async () => {
    const a = await new DeviceIdentityStore(join(dir, 'a.json')).get()
    const b = await new DeviceIdentityStore(join(dir, 'b.json')).get()

    expect(a.fingerprint).not.toBe(b.fingerprint)
  })
})
