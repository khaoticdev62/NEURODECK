import { useEffect, useRef } from 'react'
import { useToast } from '../../components/overlays/useToast'
import { onPowerStateEvent } from '../../services/ipc/powerClient'

function formatSuspendedDuration(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return 'less than a minute'
  if (minutes === 1) return '1 minute'
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.round(minutes / 60)
  return hours === 1 ? '1 hour' : `${hours} hours`
}

/**
 * Real Epic 12 "Resume after suspend" handling (mega-prompt §31): subscribes
 * to the real Electron `powerMonitor` events forwarded from the main
 * process (`registerPowerHandlers.ts`) and notifies the user via the
 * existing toast system. There is no separate core-service process to
 * pause here and this app never tries to veto or delay the OS's own
 * suspend decision — this is detection and notification only, the same
 * scope the controller disconnect/reconnect toasts use.
 */
export function PowerStateBridge(): null {
  const { push } = useToast()
  const suspendedAtRef = useRef<number | null>(null)

  useEffect(() => {
    return onPowerStateEvent((event) => {
      // Lock/unlock fire far more often than a real suspend during normal
      // use (e.g. an idle-timeout screen lock) — forwarded over IPC for any
      // future consumer, but intentionally silent here to avoid toast spam.
      if (event.type === 'suspend') {
        suspendedAtRef.current = event.timestamp
        return
      }
      if (event.type !== 'resume') return

      const suspendedAt = suspendedAtRef.current
      suspendedAtRef.current = null
      push({
        category: 'information',
        title: 'Resumed from suspend',
        description: suspendedAt
          ? `The system was suspended for about ${formatSuspendedDuration(event.timestamp - suspendedAt)}. Terminal sessions and live data may need a refresh.`
          : 'Terminal sessions and live data may need a refresh.'
      })
    })
  }, [push])

  return null
}
