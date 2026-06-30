import { generateKeyPairSync } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExtensionRuntime } from '../ExtensionRuntime'
import { ExtensionStore } from '../ExtensionStore'
import { TrustedPublisherStore } from '../TrustedPublisherStore'
import { canonicalizeManifestForSigning, signManifestPayload } from '../ManifestSignature'

let dir: string
let store: ExtensionStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-extension-runtime-'))
  store = new ExtensionStore(join(dir, 'extensions.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const MANIFEST = {
  schemaVersion: '1',
  id: 'ext.demo',
  name: 'Demo',
  version: '1.0.0',
  publisher: 'demo',
  description: 'demo',
  type: 'command',
  entrypoints: { main: 'index.js' },
  capabilities: [{ capability: 'show-notification', reason: 'Notify the user.' }],
  minimumNdxVersion: '0.1.0',
  supportedPlatforms: []
}

function fakeHost(): { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> } {
  return { start: vi.fn(), stop: vi.fn() }
}

describe('ExtensionRuntime', () => {
  it('install() validates a real manifest and only grants capabilities both requested and approved', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const notify = vi.fn()
    const runtime = new ExtensionRuntime(store, host as never, notify)

    const record = await runtime.install({
      directoryPath: dir,
      approvedCapabilities: ['show-notification', 'network-access']
    })

    expect(record.grantedCapabilities).toEqual(['show-notification'])
    expect(record.state).toBe('installed')
    expect(notify).toHaveBeenCalledWith(record)
    expect(await store.get('ext.demo')).toEqual(record)
  })

  it('install() rejects an invalid manifest and does not persist anything', async () => {
    const host = fakeHost()
    const runtime = new ExtensionRuntime(store, host as never, vi.fn())

    await expect(
      runtime.install({ directoryPath: dir, approvedCapabilities: [] })
    ).rejects.toThrow()
    expect(await store.list()).toEqual([])
  })

  it('setEnabled(true) starts the real host and persists the enabled state', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const runtime = new ExtensionRuntime(store, host as never, vi.fn())
    await runtime.install({ directoryPath: dir, approvedCapabilities: ['show-notification'] })

    const updated = await runtime.setEnabled('ext.demo', true)

    expect(updated.state).toBe('enabled')
    expect(host.start).toHaveBeenCalledTimes(1)
  })

  it('setEnabled(false) stops the real host and persists the disabled state', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const runtime = new ExtensionRuntime(store, host as never, vi.fn())
    await runtime.install({ directoryPath: dir, approvedCapabilities: [] })
    await runtime.setEnabled('ext.demo', true)

    const updated = await runtime.setEnabled('ext.demo', false)

    expect(updated.state).toBe('disabled')
    expect(host.stop).toHaveBeenCalledWith('ext.demo')
  })

  it('refuses to re-enable a quarantined extension without an explicit clear first', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const runtime = new ExtensionRuntime(store, host as never, vi.fn())
    await runtime.install({ directoryPath: dir, approvedCapabilities: [] })
    await runtime.handleFault('ext.demo', 'boom', 3)

    expect((await store.get('ext.demo'))?.state).toBe('quarantined')
    await expect(runtime.setEnabled('ext.demo', true)).rejects.toThrow(/explicitly cleared/)
  })

  it('handleFault() quarantines and stops the host once the real threshold is crossed', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const notify = vi.fn()
    const runtime = new ExtensionRuntime(store, host as never, notify)
    await runtime.install({ directoryPath: dir, approvedCapabilities: [] })

    await runtime.handleFault('ext.demo', 'first', 1)
    expect((await store.get('ext.demo'))?.state).toBe('installed')
    expect(host.stop).not.toHaveBeenCalled()

    await runtime.handleFault('ext.demo', 'third', 3)

    const record = await store.get('ext.demo')
    expect(record?.state).toBe('quarantined')
    expect(record?.quarantineReason).toMatch(/Automatically quarantined/)
    expect(host.stop).toHaveBeenCalledWith('ext.demo')
  })

  it('clearQuarantine() resets fault state to disabled without restoring capabilities automatically', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const runtime = new ExtensionRuntime(store, host as never, vi.fn())
    await runtime.install({ directoryPath: dir, approvedCapabilities: ['show-notification'] })
    await runtime.handleFault('ext.demo', 'boom', 3)

    const cleared = await runtime.clearQuarantine('ext.demo')

    expect(cleared.state).toBe('disabled')
    expect(cleared.faultCount).toBe(0)
    expect(cleared.quarantineReason).toBeUndefined()
    expect(cleared.grantedCapabilities).toEqual(['show-notification'])
  })

  it('remove() stops the real host and deletes the persisted record', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const runtime = new ExtensionRuntime(store, host as never, vi.fn())
    await runtime.install({ directoryPath: dir, approvedCapabilities: [] })

    await runtime.remove('ext.demo')

    expect(host.stop).toHaveBeenCalledWith('ext.demo')
    expect(await store.get('ext.demo')).toBeUndefined()
  })

  describe('real Epic X15 signature verification', () => {
    function signedManifest(
      fingerprint: string,
      privateKeyPem: string
    ): typeof MANIFEST & {
      signature: { algorithm: string; publicKeyFingerprint: string; signature: string }
    } {
      const payload = canonicalizeManifestForSigning(MANIFEST as never)
      return {
        ...MANIFEST,
        signature: {
          algorithm: 'ed25519',
          publicKeyFingerprint: fingerprint,
          signature: signManifestPayload(payload, privateKeyPem)
        }
      }
    }

    it('marks an unsigned manifest as unsigned', async () => {
      await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
      const trustedPublishers = new TrustedPublisherStore(join(dir, 'trusted.json'))
      const runtime = new ExtensionRuntime(store, fakeHost() as never, vi.fn(), trustedPublishers)

      const record = await runtime.install({ directoryPath: dir, approvedCapabilities: [] })

      expect(record.trust).toBe('unsigned')
    })

    it('marks a signed manifest from an unknown key as signed, not verified', async () => {
      const { privateKey } = generateKeyPairSync('ed25519')
      const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
      const manifest = signedManifest('unknown-fingerprint', privateKeyPem)
      await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest), 'utf-8')
      const trustedPublishers = new TrustedPublisherStore(join(dir, 'trusted.json'))
      const runtime = new ExtensionRuntime(store, fakeHost() as never, vi.fn(), trustedPublishers)

      const record = await runtime.install({ directoryPath: dir, approvedCapabilities: [] })

      expect(record.trust).toBe('signed')
    })

    it('marks a manifest signed by a real trusted publisher as verified-publisher', async () => {
      const { publicKey, privateKey } = generateKeyPairSync('ed25519')
      const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
      const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
      const trustedPublishers = new TrustedPublisherStore(join(dir, 'trusted.json'))
      const publisher = await trustedPublishers.add(publicKeyPem, 'Demo Publisher')
      const manifest = signedManifest(publisher.fingerprint, privateKeyPem)
      await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest), 'utf-8')
      const runtime = new ExtensionRuntime(store, fakeHost() as never, vi.fn(), trustedPublishers)

      const record = await runtime.install({ directoryPath: dir, approvedCapabilities: [] })

      expect(record.trust).toBe('verified-publisher')
    })

    it('refuses to install a manifest with a forged signature claiming a trusted publisher', async () => {
      const real = generateKeyPairSync('ed25519')
      const impostor = generateKeyPairSync('ed25519')
      const realPublicKeyPem = real.publicKey.export({ type: 'spki', format: 'pem' }).toString()
      const impostorPrivateKeyPem = impostor.privateKey
        .export({ type: 'pkcs8', format: 'pem' })
        .toString()
      const trustedPublishers = new TrustedPublisherStore(join(dir, 'trusted.json'))
      const publisher = await trustedPublishers.add(realPublicKeyPem, 'Demo Publisher')
      // Signed with the impostor's key but claiming the real publisher's fingerprint.
      const manifest = signedManifest(publisher.fingerprint, impostorPrivateKeyPem)
      await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest), 'utf-8')
      const runtime = new ExtensionRuntime(store, fakeHost() as never, vi.fn(), trustedPublishers)

      await expect(
        runtime.install({ directoryPath: dir, approvedCapabilities: [] })
      ).rejects.toThrow(/does not cryptographically verify/)
      expect(await store.list()).toEqual([])
    })

    it('marks a manifest signed by a revoked trusted publisher as revoked', async () => {
      const { publicKey, privateKey } = generateKeyPairSync('ed25519')
      const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
      const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
      const trustedPublishers = new TrustedPublisherStore(join(dir, 'trusted.json'))
      const publisher = await trustedPublishers.add(publicKeyPem, 'Demo Publisher')
      await trustedPublishers.setRevoked(publisher.fingerprint, true)
      const manifest = signedManifest(publisher.fingerprint, privateKeyPem)
      await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest), 'utf-8')
      const runtime = new ExtensionRuntime(store, fakeHost() as never, vi.fn(), trustedPublishers)

      const record = await runtime.install({ directoryPath: dir, approvedCapabilities: [] })

      expect(record.trust).toBe('revoked')
    })
  })
})
