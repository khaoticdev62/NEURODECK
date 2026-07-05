import { useNavigate } from 'react-router-dom'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import { useWorkspaces } from './useWorkspaces'

interface WorkspaceRequiredStateProps {
  /** What this screen needs a workspace for, e.g. "start a terminal session". */
  purpose: string
}

/**
 * Actionable gate for inherently workspace-scoped screens (terminal, Git,
 * files, workflows, …). Since `WorkspaceProvider` auto-selects a workspace
 * whenever any exist, this renders only when the registry is genuinely
 * empty — so instead of the old dead-end "open a workspace first" text, it
 * lets the user add a folder right here (or jump to the Workspace Hub),
 * controller-first, without abandoning the screen they wanted.
 */
export function WorkspaceRequiredState({ purpose }: WorkspaceRequiredStateProps): React.JSX.Element {
  const { loading, error, addFromPicker } = useWorkspaces()
  const navigate = useNavigate()

  const { ref: addRef, isFocused: addFocused } = useFocusable<HTMLButtonElement>({
    id: 'workspace-required:add',
    groupId: 'workspace-required',
    priority: 2,
    onActivate: () => void addFromPicker()
  })

  const { ref: hubRef, isFocused: hubFocused } = useFocusable<HTMLButtonElement>({
    id: 'workspace-required:hub',
    groupId: 'workspace-required',
    priority: 1,
    onActivate: () => navigate('/workspaces')
  })

  if (loading) {
    return <p className="p-4 text-meta text-text-secondary">Loading workspaces…</p>
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-12">
      <EmptyState
        className="flex-none px-0 py-0"
        title="No workspace yet"
        description={`Add a project folder to ${purpose}. NeuroDeck remembers your workspaces and reopens the last one automatically.`}
        action={
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <ControllerButton
              ref={addRef}
              variant="primary"
              className={addFocused ? 'ring-2 ring-border-focus' : undefined}
              onClick={() => void addFromPicker()}
            >
              Add workspace folder
            </ControllerButton>
            <ControllerButton
              ref={hubRef}
              variant="secondary"
              className={hubFocused ? 'ring-2 ring-border-focus' : undefined}
              onClick={() => navigate('/workspaces')}
            >
              Open Workspace Hub
            </ControllerButton>
          </div>
        }
      />
      {error && (
        <ErrorState className="flex-none px-0 py-0" title="Workspace registry error" description={error} />
      )}
    </div>
  )
}
