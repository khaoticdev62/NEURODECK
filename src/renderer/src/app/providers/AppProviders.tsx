import { RootErrorBoundary } from '../error-boundaries/RootErrorBoundary'
import { ToastProvider } from '../../components/overlays/Toast'
import { AiSafetyProvider } from '../../ai-safety/AiSafetyProvider'
import { FocusEngineProvider } from '../../controller/focus/FocusEngineProvider'
import { WorkspaceProvider } from '../../features/workspaces/WorkspaceProvider'
import { DisplayModeProvider } from '../../state/displayMode'
import { RouterRoot } from '../routing/RouterRoot'

export function AppProviders(): React.JSX.Element {
  return (
    <RootErrorBoundary>
      <ToastProvider>
        <FocusEngineProvider>
          <AiSafetyProvider>
            <WorkspaceProvider>
              <DisplayModeProvider>
                <RouterRoot />
              </DisplayModeProvider>
            </WorkspaceProvider>
          </AiSafetyProvider>
        </FocusEngineProvider>
      </ToastProvider>
    </RootErrorBoundary>
  )
}
