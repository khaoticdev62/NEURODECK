import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { NdxExtensionManifest } from '@shared/contracts'
import {
  canonicalizeManifestForSigning,
  fingerprintPublicKey,
  signManifestPayload,
  verifyManifestSignature
} from '../ManifestSignature'

function baseManifest(): Omit<NdxExtensionManifest, 'signature'> {
  return {
    schemaVersion: '1',
    id: 'demo.extension',
    name: 'Demo Extension',
    version: '1.0.0',
    publisher: 'Demo Publisher',
    description: 'A demo extension.',
    type: 'command',
    entrypoints: { main: 'index.js' },
    capabilities: [],
    minimumNdxVersion: '0.1.0',
    supportedPlatforms: []
  }
}

function signedManifest(
  unsigned: Omit<NdxExtensionManifest, 'signature'>,
  privateKeyPem: string,
  fingerprint: string
): NdxExtensionManifest {
  const payload = canonicalizeManifestForSigning(unsigned)
  const signature = signManifestPayload(payload, privateKeyPem)
  return {
    ...unsigned,
    signature: { algorithm: 'ed25519', publicKeyFingerprint: fingerprint, signature }
  }
}

describe('ManifestSignature', () => {
  it('canonicalizes a manifest deterministically regardless of key insertion order', () => {
    const manifest = baseManifest()
    const reorderedEntries = Object.entries(manifest).reverse()
    const reordered = Object.fromEntries(reorderedEntries) as Omit<
      NdxExtensionManifest,
      'signature'
    >

    expect(canonicalizeManifestForSigning(manifest)).toBe(canonicalizeManifestForSigning(reordered))
  })

  it('verifies a real signature produced by the matching private key', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519')
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const fingerprint = fingerprintPublicKey(publicKeyPem)

    const manifest = signedManifest(baseManifest(), privateKeyPem, fingerprint)

    expect(verifyManifestSignature(manifest, publicKeyPem)).toBe(true)
  })

  it('rejects a signature once the manifest content is tampered with', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519')
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const fingerprint = fingerprintPublicKey(publicKeyPem)

    const manifest = signedManifest(baseManifest(), privateKeyPem, fingerprint)
    const tampered: NdxExtensionManifest = { ...manifest, version: '9.9.9' }

    expect(verifyManifestSignature(tampered, publicKeyPem)).toBe(false)
  })

  it('rejects a signature checked against the wrong public key', () => {
    const signer = generateKeyPairSync('ed25519')
    const impostor = generateKeyPairSync('ed25519')
    const privateKeyPem = signer.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const impostorPublicKeyPem = impostor.publicKey
      .export({ type: 'spki', format: 'pem' })
      .toString()
    const fingerprint = fingerprintPublicKey(impostorPublicKeyPem)

    const manifest = signedManifest(baseManifest(), privateKeyPem, fingerprint)

    expect(verifyManifestSignature(manifest, impostorPublicKeyPem)).toBe(false)
  })

  it('returns false for an unsigned manifest', () => {
    expect(verifyManifestSignature(baseManifest() as NdxExtensionManifest, 'irrelevant')).toBe(
      false
    )
  })
})
