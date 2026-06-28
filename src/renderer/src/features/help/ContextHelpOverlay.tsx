import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ROUTE_DEFINITIONS } from '../../app/routing/routes'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'
import { useFocusable } from '../../controller/focus/useFocusable'
import { findHelpTopicForPath } from './helpContent'

export function ContextHelpOverlay(): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const { registry, onAction, subscribe } = useFocusEngine()
  const [open, setOpen] = useState(false)
  const topic = useMemo(
    () => findHelpTopicForPath(ROUTE_DEFINITIONS, location.pathname),
    [location.pathname]
  )

  const { ref: closeRef, isFocused: closeFocused } = useFocusable<HTMLButtonElement>({
    id: 'context-help:close',
    groupId: 'context-help',
    priority: 10,
    initialFocus: true,
    onActivate: () => setOpen(false)
  })
  const { ref: hubRef, isFocused: hubFocused } = useFocusable<HTMLButtonElement>({
    id: 'context-help:hub',
    groupId: 'context-help',
    priority: 9,
    onActivate: () => {
      setOpen(false)
      navigate('/help')
    }
  })

  useEffect(() => {
    return onAction((event) => {
      if (event.action === 'assist' && event.phase === 'press') setOpen(true)
    })
  }, [onAction])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== '?' || event.repeat) return
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }
      event.preventDefault()
      setOpen(true)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    const unsubscribe = subscribe('back', () => setOpen(false))
    return () => unsubscribe()
  }, [open, subscribe])

  useEffect(() => {
    if (!open) return
    registry.pushTrap(['context-help'])
    return () => registry.popTrap()
  }, [open, registry])

  if (!open) return <></>

  return (
    <div
      className="fixed inset-0 z-[var(--ndx-z-overlay)] flex items-start justify-end bg-overlay/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false)
      }}
    >
      <aside
        role="dialog"
        aria-label="Context help"
        className="flex max-h-full w-full max-w-md flex-col gap-3 overflow-auto border border-border bg-surface p-4 shadow-elevated"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-title font-semibold text-text-primary">Context Help</p>
            <p className="text-meta text-text-secondary">
              {topic ? `${topic.title} · ${topic.owningEpic}` : 'No route topic matched.'}
            </p>
          </div>
          <ControllerButton
            ref={closeRef}
            variant="ghost"
            className={closeFocused ? 'ring-2 ring-border-focus' : ''}
            onClick={() => setOpen(false)}
          >
            Close
          </ControllerButton>
        </div>

        {topic ? (
          <>
            <p className="text-body text-text-secondary">{topic.summary}</p>
            <section className="flex flex-col gap-1">
              <p className="text-meta font-semibold uppercase tracking-wide text-text-tertiary">
                Controller
              </p>
              {topic.controllerActions.map((action) => (
                <p key={action} className="text-meta text-text-secondary">
                  {action}
                </p>
              ))}
            </section>
            <p className="text-meta text-text-tertiary">{topic.restoreBehavior}</p>
          </>
        ) : (
          <p className="text-body text-text-secondary">
            This route is not in the current screen registry. Open Help Hub to browse all registered
            screens.
          </p>
        )}

        <ControllerButton
          ref={hubRef}
          variant="secondary"
          className={hubFocused ? 'ring-2 ring-border-focus' : ''}
          onClick={() => {
            setOpen(false)
            navigate('/help')
          }}
        >
          Open Help Hub
        </ControllerButton>
      </aside>
    </div>
  )
}
