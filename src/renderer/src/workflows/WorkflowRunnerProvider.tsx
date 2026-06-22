import { useCallback, useState, type ReactNode } from 'react'
import type { WorkflowDefinition, WorkflowRun } from '@shared/contracts'
import { useAiSafety } from '../ai-safety/useAiSafety'
import { createWorkflowRun, updateWorkflowRun } from '../services/ipc/workflowClient'
import { WorkflowEngine } from './WorkflowEngine'
import { WorkflowRunnerContext } from './WorkflowRunnerContext'

/**
 * Holds one `WorkflowEngine` instance and the live state of in-flight
 * runs, shared between the Workflow Library (which starts runs) and
 * Workflow Run Detail (which approves/cancels them) — both need to act
 * on the same run, so the engine can't be re-instantiated per screen.
 */
export function WorkflowRunnerProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { queue } = useAiSafety()
  const [engine] = useState(() => new WorkflowEngine())
  const [liveRuns, setLiveRuns] = useState<Record<string, WorkflowRun>>({})

  const startRun = useCallback(
    async (workspaceId: string, definition: WorkflowDefinition): Promise<WorkflowRun | null> => {
      const created = await createWorkflowRun({ workspaceId, workflowId: definition.id })
      if (!created.ok) return null

      setLiveRuns((current) => ({ ...current, [created.data.id]: created.data }))

      void engine.start(definition, created.data, queue, (run) => {
        setLiveRuns((current) => ({ ...current, [run.id]: run }))
        void updateWorkflowRun({ workspaceId, run })
      })

      return created.data
    },
    [engine, queue]
  )

  const resolveApproval = useCallback(
    (runId: string, approved: boolean) => engine.resolveApproval(runId, approved),
    [engine]
  )

  const cancelRun = useCallback((runId: string) => engine.cancel(runId), [engine])

  return (
    <WorkflowRunnerContext.Provider value={{ liveRuns, startRun, resolveApproval, cancelRun }}>
      {children}
    </WorkflowRunnerContext.Provider>
  )
}
