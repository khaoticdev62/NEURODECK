import type {
  BrowserTab,
  BrowserTabIdRequest,
  CreateBrowserTabRequest,
  NavigateBrowserTabRequest,
  NdxResult,
  SetBrowserTabBoundsRequest,
  WorkspaceBrowserRequest
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function listBrowserTabs(
  request: WorkspaceBrowserRequest
): Promise<NdxResult<BrowserTab[]>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.browserTabs.list(request)
}

export async function createBrowserTab(
  request: CreateBrowserTabRequest
): Promise<NdxResult<BrowserTab>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.browserTabs.create(request)
}

export async function setActiveBrowserTab(
  request: BrowserTabIdRequest
): Promise<NdxResult<BrowserTab>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.browserTabs.setActive(request)
}

export async function navigateBrowserTab(
  request: NavigateBrowserTabRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.browserTabs.navigate(request)
}

export async function goBackBrowserTab(request: BrowserTabIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.browserTabs.goBack(request)
}

export async function goForwardBrowserTab(request: BrowserTabIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.browserTabs.goForward(request)
}

export async function reloadBrowserTab(request: BrowserTabIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.browserTabs.reload(request)
}

export async function setBrowserTabBounds(
  request: SetBrowserTabBoundsRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.browserTabs.setBounds(request)
}

export async function removeBrowserTab(request: BrowserTabIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.browserTabs.remove(request)
}

export async function openExternalUrl(url: string): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge) return bridgeUnavailableError()
  return bridge.browserTabs.openExternal(url)
}

export function onBrowserTabUpdate(listener: (tab: BrowserTab) => void): () => void {
  return getNdxBridge()?.browserTabs.onUpdate(listener) ?? (() => undefined)
}
