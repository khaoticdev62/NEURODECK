import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { NdxError } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState } from '../../components/feedback/UXState'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'
import { useFocusable } from '../../controller/focus/useFocusable'
import { useToast } from '../../components/overlays/useToast'
import { NdxDenseRow, NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { getDiagnosticsInfo } from '../../services/ipc/diagnosticsClient'
import { collectSystemMetrics } from '../../services/ipc/systemClient'
import { quitApp } from '../../services/ipc/powerClient'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'

export interface ErrorRecoveryError {
  code: string
  category: NdxError['category']
  userMessage: string
  message?: string
  retryable: boolean
  details?: Record<string, unknown>
  correlationId?: string
  affectedFeature: string
  whatStillWorks: string
  recoveryActions: RecoveryAction[]
}

export type RecoveryAction =
  | { kind: 'retry'; label: string; run: () => void }
  | { kind: 'navigate'; label: string; to: string }
  | { kind: 'export-diagnostics'; label: string }
  | { kind: 'quit'; label: string }

interface ErrorRecoveryLocationState {
  error?: ErrorRecoveryError
}

interface ErrorRecoveryContentProps {
  error?: ErrorRecoveryError
  onNavigate: (to: string) => void
  onQuit: () => void
}

function ActionRow({
  action,
  index,
  onActivate
}: {
  action: RecoveryAction
  index: number
  onActivate: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLLIElement>({
    id: `error-recovery-action:${index}`,
    groupId: 'error-recovery',
    priority: index === 0 ? 1 : 0,
    initialFocus: index === 0,
    onActivate
  })

  return (
    <li ref={ref} tabIndex={-1} className="outline-none">
      <NdxDenseRow selected={isFocused}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-body font-medium text-text-primary">{action.label}</span>
          <ControllerButton
            aria-label={action.label}
            variant={index === 0 ? 'primary' : 'secondary'}
            onClick={onActivate}
          >
            Select
          </ControllerButton>
        </div>
      </NdxDenseRow>
    </li>
  )
}

export function ErrorRecoveryContent({
  error,
  onNavigate,
  onQuit
}: ErrorRecoveryContentProps): React.JSX.Element {
  const { subscribe } = useFocusEngine()
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  useEffect(() => {
    return subscribe('back', () => {
      onNavigate('/')
    })
  }, [subscribe, onNavigate])

  const actions = useMemo(() => {
    if (!error) return []
    return error.recoveryActions
  }, [error])

  async function handleExportDiagnostics(): Promise<void> {
    setExporting(true)
    setExportStatus(null)
    const infoResult = await getDiagnosticsInfo()
    const metricsResult = await collectSystemMetrics()
    setExporting(false)

    if (!infoResult.ok) {
      setExportStatus(`Could not load diagnostics: ${infoResult.error.userMessage}`)
      return
    }

    const payload = {
      error: {
        code: error?.code,
        category: error?.category,
        userMessage: error?.userMessage,
        correlationId: error?.correlationId
      },
      diagnostics: infoResult.data,
      systemMetrics: metricsResult.ok ? metricsResult.data : null,
      exportedAt: new Date().toISOString()
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      setExportStatus('Diagnostics copied to clipboard.')
      toast.push({ category: 'success', title: 'Diagnostics copied to clipboard' })
    } catch {
      setExportStatus('Could not copy diagnostics to clipboard.')
    }
  }

  const activateAction = useCallback(
    (action: RecoveryAction): void => {
      switch (action.kind) {
        case 'retry':
          action.run()
          break
        case 'navigate':
          onNavigate(action.to)
          break
        case 'export-diagnostics':
          void handleExportDiagnostics()
          break
        case 'quit':
          onQuit()
          break
      }
    },
    // handleExportDiagnostics references error/toast/exporting which all change;
    // use stable onNavigate/onQuit from props and capture the handler by ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onNavigate, onQuit, exporting]
  )

  const setPrimary = useWorkbenchStore((state) => state.setPrimary)
  const setSecondary = useWorkbenchStore((state) => state.setSecondary)

  useEffect(() => {
    if (!error) return
    setPrimary('Error Details', error.category, (
      <NdxToolWindow title="Error Details" subtitle={error.category}>
        <Field label="Technical code" value={error.code} />
        <Field label="Category" value={error.category} />
        <Field label="Affected feature" value={error.affectedFeature} />
        {error.correlationId && <Field label="Correlation ID" value={error.correlationId} />}
      </NdxToolWindow>
    ))
    return () => setPrimary('Command Deck', undefined, null)
  }, [error, setPrimary])

  useEffect(() => {
    setSecondary(
      <NdxToolWindow title="Recovery Actions" subtitle={`${actions.length} available`} side="right">
        {actions.length > 0 && (
          <ul className="flex flex-col gap-2">
            {actions.map((action, index) => (
              <ActionRow
                key={`${action.kind}:${action.label}`}
                action={action}
                index={index}
                onActivate={() => activateAction(action)}
              />
            ))}
          </ul>
        )}
      </NdxToolWindow>
    )
    return () => setSecondary(null)
  }, [actions, activateAction, setSecondary])

  if (!error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <EmptyState
          title="No error details"
          description="If you were sent here by a crash, the error payload is missing."
          action={
            <ControllerButton variant="primary" onClick={() => onNavigate('/')}>
              Return home
            </ControllerButton>
          }
        />
      </div>
    )
  }

  return (
    <div className="h-full flex-1">
      <NdxEditorShell title="Recovery">
        <div className="flex min-h-full flex-col gap-4 p-3">
          <header>
            <p className="text-title font-semibold text-text-primary">Something went wrong</p>
            <p className="max-w-3xl text-body text-text-secondary">{error.userMessage}</p>
          </header>

          <section className="space-y-2 ndx-settings-section">
            <p className="text-meta font-semibold text-text-primary">What still works</p>
            <p className="text-meta text-text-secondary">{error.whatStillWorks}</p>
          </section>

          {error.details && Object.keys(error.details).length > 0 && (
            <details className="ndx-settings-section">
              <summary className="cursor-pointer text-meta font-semibold text-text-primary">
                Diagnostic details
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-canvas p-2 text-xs text-text-secondary">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </details>
          )}

          {exportStatus && (
            <p
              className={`text-meta ${
                exportStatus.startsWith('Could not') ? 'text-status-error' : 'text-status-success'
              }`}
            >
              {exportStatus}
            </p>
          )}
          {exporting && <p className="text-meta text-text-secondary">Copying diagnostics…</p>}
        </div>
      </NdxEditorShell>
    </div>
  )
}

export function ErrorRecovery(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const error = (location.state as ErrorRecoveryLocationState | undefined)?.error

  return (
    <ErrorRecoveryContent
      error={error}
      onNavigate={(to) => navigate(to)}
      onQuit={() => void quitApp()}
    />
  )
}

function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <p className="text-meta text-text-secondary">
      {label}: <span className="text-text-primary">{value}</span>
    </p>
  )
}
