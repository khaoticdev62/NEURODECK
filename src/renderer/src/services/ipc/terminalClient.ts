import type {
  CreateTerminalRequest,
  HeadlessTerminalRequest,
  HeadlessTerminalResult,
  ListTerminalSessionsRequest,
  NdxResult,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalResizeRequest,
  TerminalSession,
  TerminalSessionRequest,
  TerminalSnapshot,
  TerminalWriteRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function createTerminal(
  request: CreateTerminalRequest
): Promise<NdxResult<TerminalSession>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.terminal.create(request)
}

export async function listTerminalSessions(
  request: ListTerminalSessionsRequest
): Promise<NdxResult<TerminalSession[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.terminal.list(request)
}

export async function getTerminalSnapshot(
  request: TerminalSessionRequest
): Promise<NdxResult<TerminalSnapshot>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.terminal.snapshot(request)
}

export async function writeTerminal(request: TerminalWriteRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.terminal.write(request)
}

export async function resizeTerminal(request: TerminalResizeRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.terminal.resize(request)
}

export async function terminateTerminal(request: TerminalSessionRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.terminal.terminate(request)
}

export async function runHeadlessTerminal(
  request: HeadlessTerminalRequest
): Promise<NdxResult<HeadlessTerminalResult>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.terminal.runHeadless(request)
}

export function onTerminalData(listener: (event: TerminalDataEvent) => void): () => void {
  return getNdxBridge()?.terminal.onData(listener) ?? (() => undefined)
}

export function onTerminalExit(listener: (event: TerminalExitEvent) => void): () => void {
  return getNdxBridge()?.terminal.onExit(listener) ?? (() => undefined)
}
