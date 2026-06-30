import { createHash, sign as cryptoSign, verify as cryptoVerify } from 'node:crypto'
import type { NdxExtensionManifest } from '@shared/contracts'

/**
 * Real Epic X15 extension signature verification (supplemental §39
 * "Extension signing" / "Update signature verification"), closing the
 * presence-only gap `ExtensionRuntime.install()` previously had
 * (`trust: result.manifest.signature ? 'signed' : 'unsigned'` never
 * actually checked the signature). Ed25519 via Node's built-in
 * `node:crypto` — no new dependency, no external signing service.
 *
 * The canonical payload a signature covers is the manifest with its
 * own `signature` field removed, serialized with recursively
 * sorted keys so the same logical manifest always produces the same
 * bytes regardless of source key ordering.
 */
export function canonicalizeManifestForSigning(
  manifest: Omit<NdxExtensionManifest, 'signature'>
): string {
  return JSON.stringify(sortKeysDeep(manifest))
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

/** SHA-256 fingerprint of a raw Ed25519 public key (SPKI PEM), hex-encoded — the identifier a `TrustedPublisherRecord` is keyed by. */
export function fingerprintPublicKey(publicKeyPem: string): string {
  return createHash('sha256').update(publicKeyPem.trim()).digest('hex')
}

export function signManifestPayload(payload: string, privateKeyPem: string): string {
  return cryptoSign(null, Buffer.from(payload, 'utf-8'), privateKeyPem).toString('base64')
}

export function verifyManifestSignature(
  manifest: NdxExtensionManifest,
  publicKeyPem: string
): boolean {
  if (!manifest.signature) return false
  const unsigned = { ...manifest }
  delete unsigned.signature
  const payload = canonicalizeManifestForSigning(unsigned)
  try {
    return cryptoVerify(
      null,
      Buffer.from(payload, 'utf-8'),
      publicKeyPem,
      Buffer.from(manifest.signature.signature, 'base64')
    )
  } catch {
    return false
  }
}
