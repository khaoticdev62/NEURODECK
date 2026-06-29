import { ControllerButton } from '../../components/primitives/ControllerButton'
import { useRecording } from '../../state/useRecording'

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Real, persistent recording indicator (supplemental spec §42.2
 * "Recording indicator") — mounted globally so it stays visible no
 * matter which screen the user navigates to while recording, the same
 * way a real screen recorder's indicator never disappears just
 * because the foreground window changed.
 */
export function RecordingIndicatorOverlay(): React.JSX.Element | null {
  const { isRecording, elapsedMs, stopRecording } = useRecording()
  if (!isRecording) return null

  return (
    <div
      role="status"
      className="pointer-events-auto fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-3 rounded-md border border-status-error bg-surface px-4 py-2 shadow-lg"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-status-error" aria-hidden />
      <span className="text-meta font-semibold text-text-primary">
        Recording · {formatElapsed(elapsedMs)}
      </span>
      <ControllerButton variant="destructive" onClick={() => void stopRecording()}>
        Stop (F9)
      </ControllerButton>
    </div>
  )
}
