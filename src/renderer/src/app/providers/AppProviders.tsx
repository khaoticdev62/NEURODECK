import { RootErrorBoundary } from '../error-boundaries/RootErrorBoundary'
import { ToastProvider } from '../../components/overlays/Toast'
import { AiSafetyProvider } from '../../ai-safety/AiSafetyProvider'
import { FocusEngineProvider } from '../../controller/focus/FocusEngineProvider'
import { WorkspaceProvider } from '../../features/workspaces/WorkspaceProvider'
import { DisplayModeProvider } from '../../state/displayMode'
import { DisplaySettingsProvider } from '../../state/displaySettings'
import { LockProvider } from '../../state/lockState'
import { WorkflowRunnerProvider } from '../../workflows/WorkflowRunnerProvider'
import { RouterRoot } from '../routing/RouterRoot'

export function AppProviders(): React.JSX.Element {
  return (
    <RootErrorBoundary>
      <ToastProvider>
        <FocusEngineProvider>
          <AiSafetyProvider>
            <WorkspaceProvider>
              <WorkflowRunnerProvider>
                <DisplayModeProvider>
                  <DisplaySettingsProvider>
                    <LockProvider>
                      <RouterRoot />
                    </LockProvider>
                  </DisplaySettingsProvider>
                </DisplayModeProvider>
              </WorkflowRunnerProvider>
            </WorkspaceProvider>
          </AiSafetyProvider>
        </FocusEngineProvider>
      </ToastProvider>
    </RootErrorBoundary>
  )
}
