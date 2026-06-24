import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/contracts'
import type { NdxResult, UpdateStatus } from '@shared/contracts'
import type { UpdateService } from '../../core/system/UpdateService'

export function registerUpdateHandlers(updateService: UpdateService): void {
  ipcMain.handle(IPC_CHANNELS.updateGetStatus, async (): Promise<NdxResult<UpdateStatus>> => {
    return updateService.getStatus()
  })

  ipcMain.handle(IPC_CHANNELS.updateCheck, async (): Promise<NdxResult<UpdateStatus>> => {
    return updateService.check()
  })
}
