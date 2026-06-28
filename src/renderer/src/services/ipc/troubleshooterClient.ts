import type {
  NdxResult,
  RunTroubleshooterCheckRequest,
  TroubleshooterResult
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function runTroubleshooterCheck(
  request: RunTroubleshooterCheckRequest
): Promise<NdxResult<TroubleshooterResult>> {
  const bridge = getNdxBridge()
  if (!bridge?.troubleshooter) return bridgeUnavailableError()
  return bridge.troubleshooter.runCheck(request)
}
