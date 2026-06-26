import { ipcMain } from 'electron'
import { IPC_CHANNELS, type FeatureState, type NdxResult } from '@shared/contracts'
import type { CapabilityRegistry } from '../../core/capability/CapabilityRegistry'
import type { FeatureRegistry } from '../../core/feature/FeatureRegistry'

/**
 * Real Epic X1 Feature Registry IPC (supplemental spec §34). Profile/
 * extension/Safe Mode/guest-mode signals aren't real yet (Epics X3/X10/
 * X11) — visibility is computed against real, live capability state
 * only until those exist, which is the honest current behavior rather
 * than a stub for context fields that have nothing real to read from.
 */
export function registerFeatureHandlers(
  registry: FeatureRegistry,
  capabilityRegistry: CapabilityRegistry
): void {
  ipcMain.handle(IPC_CHANNELS.featureList, async (): Promise<NdxResult<FeatureState[]>> => {
    const capabilities = await capabilityRegistry.list()
    return { ok: true, data: registry.list({ capabilities }) }
  })
}
