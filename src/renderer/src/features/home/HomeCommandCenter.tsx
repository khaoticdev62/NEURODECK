import { useNavigate } from 'react-router-dom'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'

/**
 * ND-008 Home Command Center. The spec's "Continue cards", "Pinned
 * workspaces", "Recommendations", and "Running tasks" modules all need real
 * data from services that don't exist yet (Workspace Service: Epic 5;
 * action/task queue: Epic 4/8). Since there are genuinely zero workspaces
 * right now, the spec's own defined Empty State ("Create or discover a
 * workspace") is the honest, real thing to render — not a placeholder.
 */
export function HomeCommandCenter(): React.JSX.Element {
  const navigate = useNavigate()
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: 'home:discover-workspace',
    groupId: 'home',
    priority: 1,
    initialFocus: true,
    onActivate: () => navigate('/workspaces')
  })

  return (
    <div className="flex h-full flex-col">
      <div>
        <p className="text-title font-semibold text-text-primary">Home</p>
      </div>
      <EmptyState
        className="flex-1"
        title="Create or discover a workspace"
        description="Open a folder, clone a Git repository, connect a remote host, or try the sample learning lab to get started."
        action={
          <div className="flex gap-2">
            <ControllerButton
              ref={ref}
              variant="primary"
              className={isFocused ? 'ring-2 ring-border-focus' : undefined}
              onClick={() => navigate('/workspaces')}
            >
              Open folder
            </ControllerButton>
            <ControllerButton variant="secondary" onClick={() => navigate('/workspaces')}>
              Clone Git repository
            </ControllerButton>
            <ControllerButton variant="secondary" onClick={() => navigate('/learn')}>
              Sample learning lab
            </ControllerButton>
          </div>
        }
      />
    </div>
  )
}
