import { describe, expect, it } from 'vitest'
import {
  blobToBase64,
  buildDesktopCaptureConstraints,
  estimatedBytesPerSecond,
  resolutionDimensions
} from '../recordingMedia'

function testBlob(bytes: Uint8Array): Blob {
  return {
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    size: bytes.byteLength,
    type: 'application/octet-stream'
  } as Blob
}

describe('resolutionDimensions', () => {
  it('returns real pixel targets for 720p and 1080p', () => {
    expect(resolutionDimensions('720p')).toEqual({ width: 1280, height: 720 })
    expect(resolutionDimensions('1080p')).toEqual({ width: 1920, height: 1080 })
  })

  it('omits dimensions for native so Chromium captures the source at its own resolution', () => {
    expect(resolutionDimensions('native')).toBeUndefined()
  })
})

describe('buildDesktopCaptureConstraints', () => {
  it('builds the real Electron chromeMediaSource shape with resolution bounds', () => {
    const constraints = buildDesktopCaptureConstraints('screen:0', '1080p', 30) as unknown as {
      video: { mandatory: Record<string, unknown> }
    }
    expect(constraints.video.mandatory).toMatchObject({
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: 'screen:0',
      minWidth: 1920,
      maxWidth: 1920,
      minHeight: 1080,
      maxHeight: 1080,
      maxFrameRate: 30
    })
  })

  it('omits width/height bounds for native resolution', () => {
    const constraints = buildDesktopCaptureConstraints('screen:0', 'native', 30) as unknown as {
      video: { mandatory: Record<string, unknown> }
    }
    expect(constraints.video.mandatory.minWidth).toBeUndefined()
    expect(constraints.video.mandatory.chromeMediaSource).toBe('desktop')
  })
})

describe('blobToBase64', () => {
  it('round-trips real binary data through base64', async () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255])
    const blob = testBlob(bytes)

    const base64 = await blobToBase64(blob as unknown as globalThis.Blob)
    const decoded = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))

    expect(Array.from(decoded)).toEqual(Array.from(bytes))
  })
})

describe('estimatedBytesPerSecond', () => {
  it('returns a real, distinct estimate per resolution tier', () => {
    expect(estimatedBytesPerSecond('1080p')).toBeGreaterThan(estimatedBytesPerSecond('720p'))
    expect(estimatedBytesPerSecond('native')).toBeGreaterThan(0)
  })
})
