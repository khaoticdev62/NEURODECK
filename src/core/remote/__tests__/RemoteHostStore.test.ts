import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { RemoteHostStore } from '../RemoteHostStore'
import type { SecretCipher } from '../../models/SecretCipher'

const directories: string[] = []

afterEach(async () =>
  Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
)

describe('RemoteHostStore', () => {
  it('stores SSH secrets encrypted and only returns public host metadata', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ndx-remote-host-'))
    directories.push(directory)
    const filePath = join(directory, 'remote-hosts.json')
    const store = new RemoteHostStore(filePath, reversibleCipher)

    const host = await store.add({
      name: 'Lab box',
      hostname: 'lab.local',
      port: 22,
      username: 'deck',
      authMethod: 'password',
      secret: 'correct-horse-battery-staple'
    })

    expect(host).toMatchObject({
      name: 'Lab box',
      hostname: 'lab.local',
      username: 'deck',
      authMethod: 'password',
      hasSecret: true,
      trustedFingerprint: null,
      trustedAt: null
    })
    expect(await store.getSecret(host.id)).toBe('correct-horse-battery-staple')

    const raw = await readFile(filePath, 'utf-8')
    expect(raw).not.toContain('correct-horse-battery-staple')
    expect(raw).toContain('encrypted:elpats-yrettab-esroh-tcerroc')
  })

  it('records the trusted host fingerprint without accepting renderer-provided trust', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ndx-remote-host-'))
    directories.push(directory)
    const store = new RemoteHostStore(join(directory, 'remote-hosts.json'), reversibleCipher)
    const host = await store.add({
      name: 'Prod shell',
      hostname: 'prod.local',
      port: 22,
      username: 'ops',
      authMethod: 'privateKey',
      privateKeyPath: 'C:\\keys\\prod'
    })

    expect(host.trustedFingerprint).toBeNull()

    await store.recordTrustedFingerprint(host.id, 'SHA256:abc')
    const trusted = await store.get(host.id)

    expect(trusted?.trustedFingerprint).toBe('SHA256:abc')
    expect(trusted?.trustedAt).toEqual(expect.any(Number))
  })
})

const reversibleCipher: SecretCipher = {
  isAvailable: () => true,
  encrypt: (plaintext) => `encrypted:${plaintext.split('').reverse().join('')}`,
  decrypt: (ciphertext) =>
    ciphertext
      .replace(/^encrypted:/, '')
      .split('')
      .reverse()
      .join('')
}
