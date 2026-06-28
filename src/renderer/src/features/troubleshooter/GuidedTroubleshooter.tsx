import { useState } from 'react'
import type {
  TroubleshooterCheckStatus,
  TroubleshooterIssueId,
  TroubleshooterResult
} from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { runTroubleshooterCheck } from '../../services/ipc/troubleshooterClient'

const ISSUE_LABELS: Record<TroubleshooterIssueId, string> = {
  'no-network': 'No network',
  'model-unavailable': 'Model/provider unavailable',
  'no-microphone': 'No microphone',
  'storage-low': 'Storage low',
  'extension-crash': 'Extension crash',
  'update-failure': 'Update failure'
}
const ISSUE_IDS = Object.keys(ISSUE_LABELS) as TroubleshooterIssueId[]

const STATUS_COLOR: Record<TroubleshooterCheckStatus, string> = {
  pass: 'text-status-success',
  fail: 'text-status-error',
  warning: 'text-status-warning',
  unknown: 'text-text-tertiary'
}

/**
 * Epic X13 Guided Troubleshooter (supplemental spec §41.3). "The
 * troubleshooter must run real diagnostics and never pretend an issue
 * is fixed" — every issue here runs a real backend check
 * (`GuidedTroubleshooterService`) except Controller, which runs the
 * real browser Gamepad API directly (no IPC needed, and no fabricated
 * "controller detected" state). Issues from the spec's list with no
 * real diagnostic source in this codebase yet (Focus stuck, Steam
 * shortcut broken, VPN failure, Display unusable, Database recovery)
 * are intentionally not offered here — see
 * `GuidedTroubleshooterService`'s doc comment for why.
 */
export function GuidedTroubleshooter(): React.JSX.Element {
  const [results, setResults] = useState<Record<TroubleshooterIssueId, TroubleshooterResult>>(
    {} as Record<TroubleshooterIssueId, TroubleshooterResult>
  )
  const [running, setRunning] = useState<TroubleshooterIssueId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [controllerCheck, setControllerCheck] = useState<string | null>(null)

  async function handleRun(issueId: TroubleshooterIssueId): Promise<void> {
    setRunning(issueId)
    setError(null)
    const result = await runTroubleshooterCheck({ issueId })
    setRunning(null)
    if (result.ok) {
      setResults((current) => ({ ...current, [issueId]: result.data }))
    } else {
      setError(result.error.userMessage)
    }
  }

  function handleCheckController(): void {
    const pads =
      typeof navigator.getGamepads === 'function'
        ? navigator.getGamepads().filter((pad) => pad !== null)
        : []
    setControllerCheck(
      pads.length > 0
        ? `${pads.length} controller(s) detected: ${pads.map((pad) => pad?.id).join(', ')}`
        : 'No controller detected. Press a button on the controller and try again — browsers only report a gamepad after it sends input.'
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <p className="text-title font-semibold text-text-primary">Guided Troubleshooter</p>
      <p className="text-meta text-text-secondary">
        Every check below runs a real diagnostic against this device — nothing here is simulated,
        and no issue is ever reported as fixed without a real passing check.
      </p>

      {error && <ErrorState title="Troubleshooter error" description={error} />}

      <article className="border border-border bg-surface p-3">
        <p className="text-meta font-semibold text-text-primary">Controller not detected</p>
        <ControllerButton className="mt-2" onClick={handleCheckController}>
          Check controller
        </ControllerButton>
        {controllerCheck && <p className="mt-2 text-meta text-text-secondary">{controllerCheck}</p>}
      </article>

      {ISSUE_IDS.map((issueId) => {
        const result = results[issueId]
        return (
          <article key={issueId} className="border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-meta font-semibold text-text-primary">{ISSUE_LABELS[issueId]}</p>
              <ControllerButton
                disabled={running === issueId}
                onClick={() => void handleRun(issueId)}
              >
                {running === issueId ? 'Running…' : 'Run diagnostic'}
              </ControllerButton>
            </div>

            {result && (
              <div className="mt-2">
                <p className={`text-meta font-semibold ${STATUS_COLOR[result.overallStatus]}`}>
                  Overall: {result.overallStatus}
                </p>
                <ul className="mt-1 grid gap-1 text-caption text-text-secondary">
                  {result.steps.map((step) => (
                    <li key={step.label}>
                      <span className={STATUS_COLOR[step.status]}>{step.status}</span> —{' '}
                      {step.label}: {step.detail}
                    </li>
                  ))}
                </ul>
                {result.remediation.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-caption text-text-tertiary">
                    {result.remediation.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
