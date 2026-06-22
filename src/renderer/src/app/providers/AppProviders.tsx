import { RootErrorBoundary } from '../error-boundaries/RootErrorBoundary'
import { ToastProvider } from '../../components/overlays/Toast'
import { DisplayModeProvider } from '../../state/displayMode'
import { RouterRoot } from '../routing/RouterRoot'

export function AppProviders(): React.JSX.Element {
  return (
    <RootErrorBoundary>
      <ToastProvider>
        <DisplayModeProvider>
          <RouterRoot />
        </DisplayModeProvider>
      </ToastProvider>
    </RootErrorBoundary>
  )
}
