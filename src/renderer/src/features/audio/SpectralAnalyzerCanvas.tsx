import { useEffect, useRef } from 'react'
import type { MicrophoneAnalyserControls } from './useMicrophoneAnalyser'

const BAR_COUNT = 48
const PEAK_DECAY_PER_FRAME = 1.5
const FALLBACK_ACCENT_RGB = '145 126 255'

export interface SpectralAnalyzerCanvasProps {
  analyser: MicrophoneAnalyserControls
  /** Keeps a slowly-decaying max-value overlay per bar instead of only the instantaneous level. */
  holdPeaks: boolean
}

/**
 * Real-time frequency-bar visualization driven by
 * `AnalyserNode.getByteFrequencyData()`. Drawn imperatively inside a
 * `requestAnimationFrame` loop rather than through React state per frame —
 * a 60fps state update would re-render the whole component tree for no
 * visual benefit the canvas doesn't already provide directly.
 */
export function SpectralAnalyzerCanvas({
  analyser,
  holdPeaks
}: SpectralAnalyzerCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const peaksRef = useRef<number[]>(new Array(BAR_COUNT).fill(0))

  useEffect(() => {
    if (!analyser.active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const accentRgb =
      getComputedStyle(canvas).getPropertyValue('--ndx-accent-rgb').trim() || FALLBACK_ACCENT_RGB
    let frameId: number

    function draw(): void {
      const data = analyser.getFrequencyData()
      if (!data) {
        frameId = requestAnimationFrame(draw)
        return
      }
      const width = canvas!.width
      const height = canvas!.height
      ctx!.clearRect(0, 0, width, height)
      const barWidth = width / BAR_COUNT

      for (let i = 0; i < BAR_COUNT; i++) {
        // Log-scale bucket grouping so most of the spectrum's real energy
        // (which concentrates below ~1kHz) isn't crammed into the first
        // couple of linear-scale bars.
        const start = Math.floor((data.length * i ** 1.5) / BAR_COUNT ** 1.5)
        const end = Math.max(
          start + 1,
          Math.floor((data.length * (i + 1) ** 1.5) / BAR_COUNT ** 1.5)
        )
        let sum = 0
        for (let j = start; j < end; j++) sum += data[j]
        const average = sum / (end - start)
        const barHeight = (average / 255) * height

        ctx!.fillStyle = `rgb(${accentRgb} / 0.85)`
        ctx!.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight)

        if (holdPeaks) {
          peaksRef.current[i] = Math.max(barHeight, peaksRef.current[i] - PEAK_DECAY_PER_FRAME)
          ctx!.fillStyle = `rgb(${accentRgb})`
          ctx!.fillRect(i * barWidth, height - peaksRef.current[i] - 2, barWidth - 1, 2)
        }
      }
      frameId = requestAnimationFrame(draw)
    }

    frameId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameId)
  }, [analyser, holdPeaks])

  useEffect(() => {
    if (!analyser.active) peaksRef.current = new Array(BAR_COUNT).fill(0)
  }, [analyser.active])

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={120}
      role="img"
      aria-label="Live microphone frequency spectrum"
      className="w-full rounded-sm border border-[var(--ndx-workbench-border)] bg-canvas"
    />
  )
}
