import type {
  AddRemoteHostRequest,
  CreateRemoteSessionRequest,
  NdxResult,
  RemoteConnectionTestResult,
  RemoteHost,
  RemoteHostRequest,
  RemoteSession,
  RemoteSessionDataEvent,
  RemoteSessionExitEvent,
  RemoteSessionRequest,
  RemoteSessionResizeRequest,
  RemoteSessionSnapshot,
  RemoteSessionWriteRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listRemoteHosts(): Promise<NdxResult<RemoteHost[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.remoteHosts.list()
}

export async function addRemoteHost(request: AddRemoteHostRequest): Promise<NdxResult<RemoteHost>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.remoteHosts.add(request)
}

export async function removeRemoteHost(request: RemoteHostRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.remoteHosts.remove(request)
}

export async function testRemoteHostConnection(
  request: RemoteHostRequest
): Promise<NdxResult<RemoteConnectionTestResult>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.remoteHosts.testConnection(request)
}

export async function createRemoteSession(
  request: CreateRemoteSessionRequest
): Promise<NdxResult<RemoteSession>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.remoteSessions.create(request)
}

export async function getRemoteSessionSnapshot(
  request: RemoteSessionRequest
): Promise<NdxResult<RemoteSessionSnapshot>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.remoteSessions.snapshot(request)
}

export async function writeRemoteSession(
  request: RemoteSessionWriteRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.remoteSessions.write(request)
}

export async function resizeRemoteSession(
  request: RemoteSessionResizeRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.remoteSessions.resize(request)
}

export async function terminateRemoteSession(
  request: RemoteSessionRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.remoteSessions.terminate(request)
}

export function onRemoteSessionData(listener: (event: RemoteSessionDataEvent) => void): () => void {
  return getNdxBridge()?.remoteSessions.onData(listener) ?? (() => undefined)
}

export function onRemoteSessionExit(listener: (event: RemoteSessionExitEvent) => void): () => void {
  return getNdxBridge()?.remoteSessions.onExit(listener) ?? (() => undefined)
}
