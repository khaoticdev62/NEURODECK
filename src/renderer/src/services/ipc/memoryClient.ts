import type {
  ClearMemoryScopeRequest,
  MemoryDisabledState,
  MemoryExport,
  MemoryIdRequest,
  MemoryItem,
  MemoryQueryRequest,
  NdxResult,
  SetMemoryDisabledRequest,
  UpdateMemoryRequest,
  WriteMemoryRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listMemory(request?: MemoryQueryRequest): Promise<NdxResult<MemoryItem[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.memory.list(request)
}

export async function writeMemory(request: WriteMemoryRequest): Promise<NdxResult<MemoryItem>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.memory.write(request)
}

export async function updateMemory(request: UpdateMemoryRequest): Promise<NdxResult<MemoryItem>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.memory.update(request)
}

export async function deleteMemory(request: MemoryIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.memory.delete(request)
}

export async function setMemoryDisabled(
  request: SetMemoryDisabledRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.memory.setDisabled(request)
}

export async function getMemoryDisabledState(): Promise<NdxResult<MemoryDisabledState>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.memory.getDisabledState()
}

export async function clearMemoryScope(
  request: ClearMemoryScopeRequest
): Promise<NdxResult<number>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.memory.clearScope(request)
}

export async function exportMemory(request?: MemoryQueryRequest): Promise<NdxResult<MemoryExport>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.memory.export(request)
}
