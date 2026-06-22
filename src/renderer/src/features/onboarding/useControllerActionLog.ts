import { useEffect, useState } from 'react'
import type { ControllerActionEvent } from '../../controller/adapters/controllerAction'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'

/** Tracks the most recent raw controller action event, for "what did I just press" UI. */
export function useControllerActionLog(): ControllerActionEvent | null {
  const { onAction } = useFocusEngine()
  const [lastEvent, setLastEvent] = useState<ControllerActionEvent | null>(null)

  useEffect(() => onAction(setLastEvent), [onAction])

  return lastEvent
}
