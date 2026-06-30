import { RootErrorBoundary } from '../error-boundaries/RootErrorBoundary'
import { ToastProvider } from '../../components/overlays/Toast'
import { AiSafetyProvider } from '../../ai-safety/AiSafetyProvider'
import { FocusEngineProvider } from '../../controller/focus/FocusEngineProvider'
import { WorkspaceProvider } from '../../features/workspaces/WorkspaceProvider'
import { DisplayModeProvider } from '../../state/displayMode'
import { DisplaySettingsProvider } from '../../state/displaySettings'
import { KioskModeProvider } from '../../state/kioskMode'
import { LockProvider } from '../../state/lockState'
import { NotificationPolicyProvider } from '../../state/notificationPolicy'
import { PresentationModeProvider } from '../../state/presentationMode'
import { RecordingProvider } from '../../state/recording'
import { ShareSheetProvider } from '../../state/shareSheet'
import { WorkflowRunnerProvider } from '../../workflows/WorkflowRunnerProvider'
import { RouterRoot } from '../routing/RouterRoot'

export function AppProviders(): React.JSX.Element {
  return (
    <RootErrorBoundary>
      <ToastProvider>
        <NotificationPolicyProvider>
          <RecordingProvider>
            <FocusEngineProvider>
              <AiSafetyProvider>
                <WorkspaceProvider>
                  <WorkflowRunnerProvider>
                    <DisplayModeProvider>
                      <DisplaySettingsProvider>
                        <PresentationModeProvider>
                          <LockProvider>
                            <KioskModeProvider>
                              <ShareSheetProvider>
                                <RouterRoot />
                              </ShareSheetProvider>
                            </KioskModeProvider>
                          </LockProvider>
                        </PresentationModeProvider>
                      </DisplaySettingsProvider>
                    </DisplayModeProvider>
                  </WorkflowRunnerProvider>
                </WorkspaceProvider>
              </AiSafetyProvider>
            </FocusEngineProvider>
          </RecordingProvider>
        </NotificationPolicyProvider>
      </ToastProvider>
    </RootErrorBoundary>
  )
}
