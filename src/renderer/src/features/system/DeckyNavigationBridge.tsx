import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onDeckyNavigate } from '../../services/ipc/deckyClient'

/**
 * Phase 4 Decky Loader bridge: when the separate Decky plugin triggers an
 * allowlisted quick action, the main process pushes a real navigation
 * event over IPC (`decky.navigate`) — this subscribes and drives the
 * actual router, the same way `PowerStateBridge` subscribes to real power
 * events. No-op when the bridge is disabled, since nothing ever pushes
 * this event in that case.
 */
export function DeckyNavigationBridge(): null {
  const navigate = useNavigate()

  useEffect(() => {
    return onDeckyNavigate((event) => navigate(event.path))
  }, [navigate])

  return null
}
