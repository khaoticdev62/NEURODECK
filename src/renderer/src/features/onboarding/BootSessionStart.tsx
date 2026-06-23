import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge } from '../../components/primitives/StatusBadge'
import { ErrorState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import { getControllerSettings } from '../../services/ipc/controllerSettingsClient'
import { listModelProviders } from '../../services/ipc/modelClient'
import { quitApp } from '../../services/ipc/powerClient'
import { collectSystemMetrics } from '../../services/ipc/systemClient'
import { listWorkspaces } from '../../services/ipc/workspaceClient'

type BootStepStatus = 'pending' | 'running' | 'ok' | 'failed'

interface BootStep {
  id: string
  label: string
  status: BootStepStatus
  detail?: string
}

type BootPhase = 'booting' | 'complete' | 'failed'

const BOOT_TIMEOUT_MS = 15000
const DETAILS_REVEAL_MS = 10000

interface BootStepResult<T> {
  ok: true
  data: T
}

interface BootStepFailure {
  ok: false
  error: string
}

/**
 * ND-001 Boot and Session Start.
 *
 * Verifies critical and optional services, restores whatever session state is
 * currently available (workspace list + active-workspace inference), and routes
 * first-time users to onboarding or returning users to Home.
 *
 * This is intentionally outside `ShellLayout` — boot runs before the global
 * shell chrome and overlays should appear.
 */
export function BootSessionStart(): React.JSX.Element {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<BootPhase>('booting')
  const [steps, setSteps] = useState<BootStep[]>([
    { id: 'core', label: 'Loading core services', status: 'pending' },
    { id: 'workspace', label: 'Restoring workspace', status: 'pending' },
    { id: 'model', label: 'Checking model runtime', status: 'pending' },
    { id: 'controller', label: 'Connecting controller', status: 'pending' }
  ])
  const [showDetails, setShowDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)

  const { ref: exitRef, isFocused: exitFocused } = useFocusable<HTMLButtonElement>({
    id: 'boot:exit',
    groupId: 'boot',
    priority: 1,
    initialFocus: true,
    onActivate: () => void quitApp()
  })

  const { ref: retryRef, isFocused: retryFocused } = useFocusable<HTMLButtonElement>({
    id: 'boot:retry',
    groupId: 'boot-failure',
    priority: 1,
    initialFocus: true,
    onActivate: () => window.location.reload()
  })

  useEffect(() => {
    function updateStep(stepId: string, status: BootStepStatus, detail?: string): void {
      if (abortRef.current) return
      setSteps((previous) =>
        previous.map((step) => (step.id === stepId ? { ...step, status, detail } : step))
      )
    }

    function finishBoot(nextPhase: BootPhase, message?: string): void {
      if (abortRef.current) return
      setPhase(nextPhase)
      if (message) setError(message)
    }

    async function runStep<T>(
      stepId: string,
      label: string,
      promise: Promise<{ ok: true; data: T } | { ok: false; error: { userMessage: string } }>
    ): Promise<BootStepResult<T> | BootStepFailure> {
      updateStep(stepId, 'running', label)
      const result = await promise
      if (abortRef.current) return { ok: false, error: 'aborted' }
      if (result.ok) {
        updateStep(stepId, 'ok')
        return { ok: true, data: result.data }
      }
      updateStep(stepId, 'failed', result.error.userMessage)
      return { ok: false, error: result.error.userMessage }
    }

    const detailsTimer = setTimeout(() => {
      if (!abortRef.current) setShowDetails(true)
    }, DETAILS_REVEAL_MS)

    const timeoutTimer = setTimeout(() => {
      if (!abortRef.current) {
        setError('Boot is taking longer than expected.')
        setPhase('failed')
      }
    }, BOOT_TIMEOUT_MS)

    async function runBoot(): Promise<void> {
      const workspaceResult = await runStep('workspace', 'Restoring workspace', listWorkspaces())
      if (!workspaceResult.ok) {
        finishBoot('failed', 'Could not load workspace state.')
        return
      }

      // Core services are considered loaded once workspace persistence is reachable.
      updateStep('core', 'ok')

      const modelResult = await runStep('model', 'Checking model runtime', listModelProviders())
      if (!modelResult.ok) {
        // Model runtime is optional for basic shell access; continue degraded.
        updateStep('model', 'failed', modelResult.error)
      }

      const controllerResult = await runStep(
        'controller',
        'Connecting controller',
        getControllerSettings()
      )
      if (!controllerResult.ok) {
        // Controller settings are optional at boot; focus engine has its own fallbacks.
        updateStep('controller', 'failed', controllerResult.error)
      }

      // System metrics are informative only.
      const metricsResult = await collectSystemMetrics()
      if (!metricsResult.ok) {
        // Not a user-facing boot step; no-op is honest here.
        // A future boot log can record this without console noise.
      }

      if (abortRef.current) return

      const hasWorkspaces = workspaceResult.data.length > 0
      const hasProviders = modelResult.ok && modelResult.data.length > 0
      const isFirstRun = !hasWorkspaces && !hasProviders

      finishBoot('complete')
      navigate(isFirstRun ? '/onboarding/welcome' : '/')
    }

    void runBoot()

    return () => {
      abortRef.current = true
      clearTimeout(detailsTimer)
      clearTimeout(timeoutTimer)
    }
  }, [navigate])

  function handleDiagnostics(): void {
    navigate('/about')
  }

  if (phase === 'failed') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
        <ErrorState
          title="Boot failed"
          description={error ?? 'A critical service failed to initialize.'}
        />
        <div className="flex gap-3">
          <ControllerButton
            ref={retryRef}
            variant="primary"
            className={retryFocused ? 'ring-2 ring-border-focus' : undefined}
            onClick={() => window.location.reload()}
          >
            Retry
          </ControllerButton>
          <ControllerButton variant="secondary" onClick={() => void handleDiagnostics()}>
            Diagnostics
          </ControllerButton>
          <ControllerButton variant="ghost" onClick={() => void quitApp()}>
            Exit
          </ControllerButton>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-8 text-center">
      <div>
        <p className="text-display font-semibold text-text-primary">NeuroDeck</p>
        <p className="text-body text-text-secondary">Controller-native AI operating harness</p>
      </div>

      <div className="w-full max-w-md">
        <ol className="flex flex-col gap-2 text-left">
          {steps.map((step) => (
            <li
              key={step.id}
              className="flex items-center justify-between rounded-md border border-border bg-surface p-3"
            >
              <span className="text-body text-text-primary">{step.label}</span>
              <StatusBadge
                tone={
                  step.status === 'ok'
                    ? 'success'
                    : step.status === 'failed'
                      ? 'error'
                      : step.status === 'running'
                        ? 'approval'
                        : 'neutral'
                }
                label={
                  step.status === 'ok'
                    ? 'Done'
                    : step.status === 'failed'
                      ? 'Failed'
                      : step.status === 'running'
                        ? '…'
                        : 'Waiting'
                }
              />
            </li>
          ))}
        </ol>
      </div>

      {showDetails && (
        <div className="max-w-md rounded-md border border-border bg-surface p-4 text-left">
          <p className="text-meta font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Details
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-meta text-text-secondary">
            {steps.map((step) =>
              step.detail ? (
                <li key={step.id}>
                  {step.label}: {step.detail}
                </li>
              ) : null
            )}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <ControllerButton
          ref={exitRef}
          variant="ghost"
          className={exitFocused ? 'ring-2 ring-border-focus' : undefined}
          onClick={() => void quitApp()}
        >
          Return to SteamOS
        </ControllerButton>
        <ControllerButton
          variant="secondary"
          onClick={() => setShowDetails((previous) => !previous)}
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </ControllerButton>
      </div>
    </div>
  )
}
