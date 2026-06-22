import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../../components/overlays/Modal'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { useActionQueueRecords } from '../../ai-safety/useActionQueueRecords'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'

/**
 * ND-054 Emergency Stop, triggered by the real `emergency.stop` action
 * (Menu+B chord or F1, wired in Epic 2). Toggles: first trigger pauses the
 * action queue and opens the dialog; a second trigger resumes. The spec's
 * "Terminate safe processes" / "Explain" buttons are omitted — there is no
 * real safe/unsafe process classification or explanation feature without a
 * terminal (Epic 6) or agent runtime (Epic 8) to classify against; adding
 * them now would be decorative, not real.
 */
export function EmergencyStopOverlay(): React.JSX.Element {
  const { subscribe } = useFocusEngine()
  const { queue } = useAiSafety()
  const records = useActionQueueRecords()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(
    () =>
      subscribe('emergency.stop', () => {
        if (queue.isBlocked()) {
          queue.resume()
          setOpen(false)
        } else {
          queue.emergencyStop()
          setOpen(true)
        }
      }),
    [subscribe, queue]
  )

  const activeCount = records.filter((record) => record.status === 'running').length

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Emergency Stop Active">
      <p className="text-body text-text-secondary">
        All NeuroDeck tool execution is paused. {activeCount} action{activeCount === 1 ? '' : 's'}{' '}
        still running.
      </p>
      <div className="flex gap-2">
        <ControllerButton
          variant="primary"
          onClick={() => {
            setOpen(false)
            navigate('/ai/timeline')
          }}
        >
          Review
        </ControllerButton>
        <ControllerButton variant="ghost" onClick={() => setOpen(false)}>
          Keep paused
        </ControllerButton>
      </div>
    </Modal>
  )
}
