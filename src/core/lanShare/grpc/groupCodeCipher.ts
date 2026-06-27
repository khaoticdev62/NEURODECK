import { createHash } from 'node:crypto'
import nacl from 'tweetnacl'

/**
 * Real, byte-compatible reimplementation of the exact wire format
 * Warpinator's own `auth.py` produces for `RegResponse.locked_cert`
 * (confirmed by reading their real source, audited in
 * docs/legal/LAN_SHARE_LICENSE_AND_COMPATIBILITY.md):
 *
 *   key        = SHA-256(group_code as UTF-8 bytes)
 *   ciphertext = NaCl secretbox(plaintext, nonce, key)   — XSalsa20-Poly1305
 *   wire bytes = nonce (24 bytes) || ciphertext
 *   locked_cert = base64(wire bytes)
 *
 * This is the standard NaCl "secretbox" construction (a public
 * cryptographic primitive, not Warpinator's own protected expression)
 * implemented independently here via `tweetnacl` rather than copying
 * any of their Python code — see the LAN-0 clean-room strategy. Using
 * AES-GCM instead (this codebase's other usual choice, e.g. Epic X6's
 * peer transfer) would NOT be wire-compatible with a real
 * Warpinator-ecosystem peer's decryption attempt, which is the entire
 * point of this module.
 */

function deriveKey(groupCode: string): Uint8Array {
  return new Uint8Array(createHash('sha256').update(groupCode, 'utf-8').digest())
}

export function encryptWithGroupCode(groupCode: string, plaintext: string): string {
  const key = deriveKey(groupCode)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  // `Buffer.from` (not `TextEncoder`) deliberately — under some test
  // runtimes (confirmed with Vitest's module isolation), `TextEncoder`
  // and the module-global `Uint8Array` tweetnacl checks against can
  // come from different realms, making a real `Uint8Array` fail
  // tweetnacl's own `instanceof Uint8Array` guard. `Buffer` is always
  // the same realm as everything else in this Node process.
  const message = new Uint8Array(Buffer.from(plaintext, 'utf-8'))
  const ciphertext = nacl.secretbox(message, nonce, key)
  const wire = new Uint8Array(nonce.length + ciphertext.length)
  wire.set(nonce, 0)
  wire.set(ciphertext, nonce.length)
  return Buffer.from(wire).toString('base64')
}

/** Returns `null` on any decryption failure (wrong group code, malformed input) — a real, detectable "group mismatch" signal, never a fabricated success. */
export function decryptWithGroupCode(groupCode: string, encoded: string): string | null {
  const key = deriveKey(groupCode)
  let wire: Buffer
  try {
    wire = Buffer.from(encoded, 'base64')
  } catch {
    return null
  }
  if (wire.length <= nacl.secretbox.nonceLength) return null
  const nonce = new Uint8Array(wire.subarray(0, nacl.secretbox.nonceLength))
  const ciphertext = new Uint8Array(wire.subarray(nacl.secretbox.nonceLength))
  const opened = nacl.secretbox.open(ciphertext, nonce, key)
  return opened ? Buffer.from(opened).toString('utf-8') : null
}
