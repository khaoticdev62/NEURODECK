import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  ndxError,
  runTroubleshooterCheckRequestSchema,
  type NdxResult,
  type TroubleshooterResult
} from '@shared/contracts'
import type { GuidedTroubleshooterService } from '../../core/troubleshooter/GuidedTroubleshooterService'

/** Real Epic X13 Guided Troubleshooter IPC — see `GuidedTroubleshooterService` for the real diagnostics behind it. */
export function registerTroubleshooterHandlers(service: GuidedTroubleshooterService): void {
  ipcMain.handle(
    IPC_CHANNELS.troubleshooterRunCheck,
    async (_event, payload: unknown): Promise<NdxResult<TroubleshooterResult>> => {
      const parsed = runTroubleshooterCheckRequestSchema.safeParse(payload)
      if (!parsed.success) {
        return {
          ok: false,
          error: ndxError(
            'validation',
            'invalid-request',
            'That troubleshooter request is invalid.'
          )
        }
      }
      return { ok: true, data: await service.runCheck(parsed.data.issueId) }
    }
  )
}
