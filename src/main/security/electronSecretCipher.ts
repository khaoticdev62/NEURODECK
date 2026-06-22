import { safeStorage } from 'electron'
import type { SecretCipher } from '../../core/models/SecretCipher'

/**
 * Real OS-level encryption (Keychain on macOS, DPAPI on Windows, libsecret
 * on Linux) via Electron's `safeStorage` — never a homegrown cipher.
 * `isAvailable()` can be `false` on Linux systems with no keyring
 * configured; `ModelProviderStore` refuses to store a plaintext API key
 * when that's the case rather than silently degrading security.
 */
export const electronSecretCipher: SecretCipher = {
  isAvailable: () => safeStorage.isEncryptionAvailable(),
  encrypt: (plaintext: string) => safeStorage.encryptString(plaintext).toString('base64'),
  decrypt: (ciphertext: string) => safeStorage.decryptString(Buffer.from(ciphertext, 'base64'))
}
