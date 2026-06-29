import type {
  AddScreenshotToWorkspaceRequest,
  CaptureScreenshotRequest,
  NdxResult,
  ScreenshotIdRequest,
  ScreenshotRecord
} from '@shared/contracts'
import { bridgeUnavailableError, getNdxBridge } from './ndxBridge'

export async function captureScreenshot(
  request: CaptureScreenshotRequest
): Promise<NdxResult<ScreenshotRecord>> {
  const bridge = getNdxBridge()
  if (!bridge?.screenshot) return bridgeUnavailableError()
  return bridge.screenshot.capture(request)
}

export async function listScreenshots(): Promise<NdxResult<ScreenshotRecord[]>> {
  const bridge = getNdxBridge()
  if (!bridge?.screenshot) return bridgeUnavailableError()
  return bridge.screenshot.list()
}

export async function copyScreenshotToClipboard(
  request: ScreenshotIdRequest
): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge?.screenshot) return bridgeUnavailableError()
  return bridge.screenshot.copyToClipboard(request)
}

export async function deleteScreenshot(request: ScreenshotIdRequest): Promise<NdxResult<null>> {
  const bridge = getNdxBridge()
  if (!bridge?.screenshot) return bridgeUnavailableError()
  return bridge.screenshot.remove(request)
}

export async function addScreenshotToWorkspace(
  request: AddScreenshotToWorkspaceRequest
): Promise<NdxResult<string>> {
  const bridge = getNdxBridge()
  if (!bridge?.screenshot) return bridgeUnavailableError()
  return bridge.screenshot.addToWorkspace(request)
}
