import { ipcMain } from 'electron'
import { IPC_CHANNELS, type CapabilityState, type NdxResult } from '@shared/contracts'
import type { CapabilityRegistry } from '../../core/capability/CapabilityRegistry'

/** Real Epic X1 Capability Registry IPC (supplemental spec §33). */
export function registerCapabilityHandlers(registry: CapabilityRegistry): void {
  ipcMain.handle(IPC_CHANNELS.capabilityList, async (): Promise<NdxResult<CapabilityState[]>> => {
    return { ok: true, data: await registry.list() }
  })

  ipcMain.handle(
    IPC_CHANNELS.capabilityRefresh,
    async (): Promise<NdxResult<CapabilityState[]>> => {
      return { ok: true, data: await registry.refresh() }
    }
  )
}
