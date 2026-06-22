import { useEffect, useState } from 'react'
import { Modal } from '../../components/overlays/Modal'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'
import { useFocusable } from '../../controller/focus/useFocusable'
import { ActivityCenter } from './ActivityCenter'
import { NotificationCenter } from './NotificationCenter'

type Tab = 'activity' | 'notifications'

/**
 * Wireframe §4.1 pairs Activity and Notifications under the same `View`
 * action, so they share one overlay with two tabs rather than each needing
 * a separate trigger that doesn't exist in the controller contract.
 */
export function ActivityAndNotificationsOverlay(): React.JSX.Element {
  const { registry, subscribe } = useFocusEngine()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('activity')

  useEffect(() => subscribe('activity', () => setOpen((current) => !current)), [subscribe])

  useEffect(() => {
    if (!open) return
    registry.pushTrap(['activity-overlay'])
    return () => registry.popTrap()
  }, [open, registry])

  const { ref: activityTabRef } = useFocusable<HTMLButtonElement>({
    id: 'activity-overlay:tab-activity',
    groupId: 'activity-overlay',
    priority: 1,
    initialFocus: true,
    onActivate: () => setTab('activity')
  })
  const { ref: notificationsTabRef } = useFocusable<HTMLButtonElement>({
    id: 'activity-overlay:tab-notifications',
    groupId: 'activity-overlay',
    onActivate: () => setTab('notifications')
  })

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Activity and Notifications" fullscreen>
      <div className="flex gap-2">
        <ControllerButton
          ref={activityTabRef}
          variant={tab === 'activity' ? 'primary' : 'secondary'}
          onClick={() => setTab('activity')}
        >
          Activity
        </ControllerButton>
        <ControllerButton
          ref={notificationsTabRef}
          variant={tab === 'notifications' ? 'primary' : 'secondary'}
          onClick={() => setTab('notifications')}
        >
          Notifications
        </ControllerButton>
      </div>
      <div className="min-h-0 flex-1">
        {tab === 'activity' ? <ActivityCenter /> : <NotificationCenter />}
      </div>
    </Modal>
  )
}
