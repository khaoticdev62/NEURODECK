import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'

interface RootErrorBoundaryProps {
  children: ReactNode
}

interface RootErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time errors so the renderer never shows a blank crashed
 * window (mega-prompt §11 requires every route to declare an error boundary).
 * Logs through the renderer console for now; Epic 4's audit service and
 * Epic 12's crash reporting will route this to durable storage.
 */
export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[RootErrorBoundary]', error, info.componentStack)
  }

  private handleReset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center bg-canvas">
          <ErrorState
            title="NeuroDeck hit an unexpected error"
            description={this.state.error.message}
            action={
              <ControllerButton variant="primary" onClick={this.handleReset}>
                Try again
              </ControllerButton>
            }
          />
        </div>
      )
    }

    return this.props.children
  }
}
