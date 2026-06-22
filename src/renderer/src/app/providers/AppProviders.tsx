import { RootErrorBoundary } from '../error-boundaries/RootErrorBoundary'
import { ToastProvider } from '../../components/overlays/Toast'
import { FocusEngineProvider } from '../../controller/focus/FocusEngineProvider'
import { DisplayModeProvider } from '../../state/displayMode'
import { RouterRoot } from '../routing/RouterRoot'

export function AppProviders(): React.JSX.Element {
  return (
    <RootErrorBoundary>
      <ToastProvider>
        <FocusEngineProvider>
          <DisplayModeProvider>
            <RouterRoot />
          </DisplayModeProvider>
        </FocusEngineProvider>
      </ToastProvider>
    </RootErrorBoundary>
  )
}
