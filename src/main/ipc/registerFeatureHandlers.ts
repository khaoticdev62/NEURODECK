import { ipcMain } from 'electron'
import { IPC_CHANNELS, type FeatureState, type NdxResult } from '@shared/contracts'
import type { CapabilityRegistry } from '../../core/capability/CapabilityRegistry'
import type { ContinuityStore } from '../../core/continuity/ContinuityStore'
import type { FeatureRegistry } from '../../core/feature/FeatureRegistry'
import type { ProfileStore } from '../../core/profiles/ProfileStore'

/**
 * Real Epic X1 Feature Registry IPC (supplemental spec §34). Profile/
 * extension/Safe Mode/guest-mode signals aren't real yet (Epics X3/X10/
 * X11) — visibility is computed against real, live capability state
 * only until those exist, which is the honest current behavior rather
 * than a stub for context fields that have nothing real to read from.
 */
export function registerFeatureHandlers(
  registry: FeatureRegistry,
  capabilityRegistry: CapabilityRegistry,
  profileStore?: ProfileStore,
  continuityStore?: ContinuityStore
): void {
  ipcMain.handle(IPC_CHANNELS.featureList, async (): Promise<NdxResult<FeatureState[]>> => {
    const capabilities = await capabilityRegistry.list()
    const profileState = profileStore ? await profileStore.getState().catch(() => null) : null
    const continuityState = continuityStore
      ? await continuityStore.getState().catch(() => null)
      : null
    return {
      ok: true,
      data: registry.list({
        capabilities,
        activeProfileId: profileState?.session.activeProfileId,
        guestModeActive: profileState?.session.guestModeActive,
        safeModeActive: continuityState?.safeModeActive
      })
    }
  })
}
