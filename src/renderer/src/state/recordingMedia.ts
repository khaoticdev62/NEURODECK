import type { RecordingResolution } from '@shared/contracts'

/** Real pixel targets for each preset — `'native'` omits width/height so Chromium captures the source's own real resolution rather than scaling it. */
export function resolutionDimensions(
  resolution: RecordingResolution
): { width: number; height: number } | undefined {
  if (resolution === '720p') return { width: 1280, height: 720 }
  if (resolution === '1080p') return { width: 1920, height: 1080 }
  return undefined
}

/**
 * Electron's own documented (non-standard) `getUserMedia` shape for
 * `chromeMediaSource: 'desktop'` capture — the DOM lib doesn't know
 * about `mandatory`/`chromeMediaSourceId`, so this is cast at the call
 * site, not given a fake standard type here.
 */
export function buildDesktopCaptureConstraints(
  sourceId: string,
  resolution: RecordingResolution,
  frameRate: number
): MediaStreamConstraints {
  const dimensions = resolutionDimensions(resolution)
  return {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
        ...(dimensions
          ? {
              minWidth: dimensions.width,
              maxWidth: dimensions.width,
              minHeight: dimensions.height,
              maxHeight: dimensions.height
            }
          : {}),
        maxFrameRate: frameRate
      }
    }
  } as unknown as MediaStreamConstraints
}

/** Real binary-to-base64 conversion using only browser APIs (no Node `Buffer` — the renderer has no Node globals). */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** A real, clearly-labeled estimate (never claimed as measured) — VP8 at a typical real-world bitrate per resolution tier. */
export function estimatedBytesPerSecond(resolution: RecordingResolution): number {
  const bitsPerSecond =
    resolution === '1080p' ? 4_000_000 : resolution === '720p' ? 2_500_000 : 4_000_000
  return bitsPerSecond / 8
}
