import { app, Notification, safeStorage } from 'electron'
import type {
  CapabilityDetectionResult,
  CapabilityDetector
} from '../../core/capability/CapabilityRegistry'
import type { CapabilityId } from '@shared/contracts'

/**
 * The handful of `CapabilityRegistry` detectors with a real, checkable
 * signal through Electron itself — `core/capability/CapabilityRegistry.ts`
 * stays Electron-free (the same boundary `electronSecretCipher` already
 * draws for `SecretCipher`), so these are provided as constructor
 * overrides from `main/ipc/index.ts` instead.
 */
export const electronCapabilityDetectors: Partial<Record<CapabilityId, CapabilityDetector>> = {
  'secure-storage': (): CapabilityDetectionResult => {
    const available = safeStorage.isEncryptionAvailable()
    return available
      ? {
          status: 'available',
          reason: 'Electron safeStorage reports OS-level encryption is available.',
          provider: 'electron-safeStorage'
        }
      : {
          status: 'unsupported',
          reason:
            'Electron safeStorage reports no OS-level encryption backend is available on this machine.'
        }
  },
  notifications: (): CapabilityDetectionResult =>
    Notification.isSupported()
      ? {
          status: 'available',
          reason: 'Electron Notification.isSupported() returned true.',
          provider: 'electron-notification'
        }
      : {
          status: 'unsupported',
          reason: 'Electron Notification.isSupported() returned false on this platform.'
        },
  'gpu-acceleration': (): CapabilityDetectionResult => {
    const status = app.getGPUFeatureStatus() as unknown as Record<string, string>
    const webgl = status.webgl ?? status.gpu_compositing ?? 'unknown'
    return webgl.includes('enabled')
      ? {
          status: 'available',
          reason: `Electron GPU feature status: ${webgl}.`,
          provider: 'electron-gpu'
        }
      : { status: 'degraded', reason: `Electron GPU feature status reports: ${webgl}.` }
  }
}
