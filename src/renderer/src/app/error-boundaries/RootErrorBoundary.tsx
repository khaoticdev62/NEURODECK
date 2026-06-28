import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorRecoveryContent, type ErrorRecoveryError } from '../../features/system/ErrorRecovery'
import { recordRendererCrashReport } from '../../services/ipc/diagnosticsClient'
import { quitApp } from '../../services/ipc/powerClient'

interface RootErrorBoundaryProps {
  children: ReactNode
}

interface RootErrorBoundaryState {
  error: Error | null
  correlationId: string | null
}

function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `crash-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function mapErrorToRecoveryError(error: Error, correlationId: string): ErrorRecoveryError {
  const code = (error.name === 'Error' ? 'RENDER_CRASH' : error.name)
    .replace(/Error$/, '')
    .toUpperCase()
  const retryable = true

  return {
    code,
    category: 'unknown',
    userMessage: error.message || 'An unexpected problem occurred while rendering the interface.',
    retryable,
    correlationId,
    affectedFeature: 'User interface',
    whatStillWorks:
      'The main process is still running, diagnostics can be exported, and you can quit or return to the home screen.',
    details: {
      stack: error.stack,
      name: error.name
    },
    recoveryActions: [
      { kind: 'retry', label: 'Try again', run: () => undefined },
      { kind: 'navigate', label: 'Return to home', to: '/' },
      {
        kind: 'export-diagnostics',
        label: 'Export diagnostics to clipboard'
      },
      { kind: 'quit', label: 'Quit NeuroDeck' }
    ]
  }
}

/**
 * Catches render-time errors so the renderer never shows a blank crashed
 * window (mega-prompt §11 requires every route to declare an error boundary).
 * Logs through the renderer console for now; Epic 4's audit service and
 * Epic 12's crash reporting will route this to durable storage.
 */
export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = { error: null, correlationId: null }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error, correlationId: generateCorrelationId() }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[RootErrorBoundary]', error, info.componentStack)
    const correlationId = this.state.correlationId ?? generateCorrelationId()
    void recordRendererCrashReport({
      message: error.message || 'An unexpected renderer error occurred.',
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
      route: `${window.location.pathname}${window.location.hash}`,
      code: error.name,
      correlationId
    }).catch(() => undefined)
  }

  private handleReset = (): void => {
    this.setState({ error: null, correlationId: null })
  }

  render(): ReactNode {
    if (this.state.error) {
      const correlationId = this.state.correlationId ?? generateCorrelationId()
      const recoveryError = mapErrorToRecoveryError(this.state.error, correlationId)
      // Replace the placeholder retry action with the real boundary reset.
      const actions = recoveryError.recoveryActions.map((action) =>
        action.kind === 'retry' ? { ...action, run: this.handleReset } : action
      )
      const error: ErrorRecoveryError = { ...recoveryError, recoveryActions: actions }

      return (
        <div className="h-full bg-canvas">
          <ErrorRecoveryContent
            error={error}
            onNavigate={(to) => {
              window.location.hash = `#${to}`
              this.handleReset()
            }}
            onQuit={() => void quitApp()}
          />
        </div>
      )
    }

    return this.props.children
  }
}
