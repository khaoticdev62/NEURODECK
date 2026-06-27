import { X509Certificate } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SecretCipher } from '../../models/SecretCipher'
import { LanShareCertificateStore } from '../LanShareCertificateStore'
import { LanShareInterfaceManager } from '../LanShareInterfaceManager'

function fakeCipher(available = true): SecretCipher {
  return {
    isAvailable: () => available,
    encrypt: (plaintext) => `ENC(${plaintext})`,
    decrypt: (ciphertext) => ciphertext.replace(/^ENC\(/, '').replace(/\)$/, '')
  }
}

describe('LanShareCertificateStore', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lan-share-cert-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('generates a real, parseable RSA-2048 self-signed X.509 certificate', async () => {
    const store = new LanShareCertificateStore(
      join(dir, 'cert.json'),
      fakeCipher(),
      new LanShareInterfaceManager()
    )
    const certificate = await store.get('test-host')

    const parsed = new X509Certificate(certificate.certificatePem)
    expect(parsed.subject).toContain('test-host')
    expect(parsed.publicKey.asymmetricKeyType).toBe('rsa')
    expect(certificate.fingerprint).toHaveLength(64)
    expect(certificate.privateKeyPem).toContain('PRIVATE KEY')
  }, 15000)

  it('persists and reuses the same certificate across reads while it remains valid', async () => {
    const filePath = join(dir, 'cert.json')
    const store = new LanShareCertificateStore(
      filePath,
      fakeCipher(),
      new LanShareInterfaceManager()
    )
    const first = await store.get('test-host')

    const reopened = new LanShareCertificateStore(
      filePath,
      fakeCipher(),
      new LanShareInterfaceManager()
    )
    const second = await reopened.get('test-host')

    expect(second.fingerprint).toBe(first.fingerprint)
  }, 15000)

  it('regenerates when the hostname changes', async () => {
    const filePath = join(dir, 'cert.json')
    const store = new LanShareCertificateStore(
      filePath,
      fakeCipher(),
      new LanShareInterfaceManager()
    )
    const first = await store.get('host-a')
    const second = await store.get('host-b')
    expect(second.fingerprint).not.toBe(first.fingerprint)
  }, 15000)
})
