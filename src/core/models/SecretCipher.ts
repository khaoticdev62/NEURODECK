/**
 * Dependency-injected secret encryption — keeps `core/` free of a direct
 * `electron` import (matching the rest of `core/`, which is plain Node so
 * it stays testable without Electron). The real implementation
 * (`src/main/security/electronSecretCipher.ts`) wraps Electron's
 * `safeStorage` (OS-level encryption: Keychain/DPAPI/libsecret) — never a
 * homegrown cipher, and never plaintext on disk.
 */
export interface SecretCipher {
  isAvailable(): boolean
  encrypt(plaintext: string): string
  decrypt(ciphertext: string): string
}
