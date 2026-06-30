import { useEffect, useState } from 'react'
import type { ContinuityState } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { getContinuityState, setSafeMode } from '../../services/ipc/continuityClient'

/**
 * Epic X11 continuity foundation. This screen reports real connectivity
 * state from the renderer, real persisted continuity metadata from the core,
 * and a real Safe Mode flag. It does not invent offline jobs; feature owners
 * must enqueue their own retryable work explicitly.
 */
export function ContinuityCenter(): React.JSX.Element {
  const [state, setState] = useState<ContinuityState | null>(null)
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getContinuityState().then((result) => {
      if (!active) return
      if (result.ok) setState(result.data)
      else setError(result.error.userMessage)
      setLoading(false)
    })

    function handleOnline(): void {
      setOnline(true)
    }
    function handleOffline(): void {
      setOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      active = false
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function handleToggleSafeMode(): Promise<void> {
    const result = await setSafeMode({ active: !state?.safeModeActive })
    if (result.ok) {
      setState(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  if (loading && !state)
    return <p className="p-4 text-meta text-text-secondary">Loading continuity state...</p>

  return (
    <div className="grid h-full min-w-[72rem] grid-cols-[20rem_minmax(36rem,1fr)_18rem] gap-2 overflow-auto">
      <NdxToolWindow title="Continuity State" subtitle="Renderer signal">
        <p className="text-meta text-text-secondary">
          Reports renderer connectivity, persisted continuity metadata, and the real Safe Mode flag.
        </p>
        <div className="border-t border-border pt-3">
          <p className="text-meta font-semibold text-text-primary">Offline queue</p>
          <p className="text-meta text-text-tertiary">
            {state?.offlineQueue.length ?? 0} queued operation
            {state?.offlineQueue.length === 1 ? '' : 's'}
          </p>
        </div>
      </NdxToolWindow>

      <NdxEditorShell title="Continuity Center">
        <div className="flex min-h-full flex-col gap-4 p-4">
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className="text-title font-semibold text-text-primary">Continuity and Offline</p>
              <p className="text-meta text-text-secondary">
                Offline, suspend/resume, session restore, crash recovery, and Safe Mode status.
              </p>
            </div>
            <ControllerButton variant="secondary" onClick={() => void handleToggleSafeMode()}>
              {state?.safeModeActive ? 'Disable Safe Mode' : 'Enable Safe Mode'}
            </ControllerButton>
          </header>

          {error && <ErrorState title="Continuity request failed" description={error} />}

          <section className="grid gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Connectivity</p>
            <Field label="Current network state" value={online ? 'Online' : 'Offline'} />
            <Field
              label="Offline queue"
              value={`${state?.offlineQueue.length ?? 0} real queued operation${
                state?.offlineQueue.length === 1 ? '' : 's'
              }`}
            />
            <p className="text-caption text-text-tertiary">
              Queue count only includes operations that feature owners explicitly enqueue. No
              synthetic jobs are generated here.
            </p>
          </section>

          <section className="grid gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Session restore</p>
            <Field
              label="Last route"
              value={state?.sessionSnapshot?.route ?? 'No route captured yet'}
            />
            <Field
              label="Captured"
              value={
                state?.sessionSnapshot
                  ? new Date(state.sessionSnapshot.capturedAt).toLocaleString()
                  : 'Not available'
              }
            />
          </section>

          <section className="grid gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Safe Mode</p>
            <Field label="Status" value={state?.safeModeActive ? 'Active' : 'Inactive'} />
            <p className="text-caption text-text-tertiary">
              Safe Mode is persisted and feeds the shared Feature Registry. Existing open views are
              not forcibly closed; navigation visibility updates when feature state refreshes.
            </p>
          </section>

          <section className="grid gap-2 border border-border bg-surface p-3">
            <p className="text-body font-semibold text-text-primary">Power events</p>
            {state && state.powerEvents.length > 0 ? (
              <ul className="grid gap-1 text-meta text-text-secondary">
                {state.powerEvents
                  .slice(-8)
                  .reverse()
                  .map((event) => (
                    <li key={event.id}>
                      {event.kind} at {new Date(event.occurredAt).toLocaleString()}
                    </li>
                  ))}
              </ul>
            ) : (
              <EmptyState
                title="No suspend or resume events"
                description="Events appear here after the OS sends real power notifications."
              />
            )}
          </section>
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Restore Policy" subtitle="Explicit queues" side="right">
        <p className="text-meta text-text-tertiary">
          This screen does not invent offline jobs. Feature owners must explicitly enqueue retryable
          work.
        </p>
      </NdxToolWindow>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <p className="text-meta text-text-secondary">
      {label}: <span className="text-text-primary">{value}</span>
    </p>
  )
}
