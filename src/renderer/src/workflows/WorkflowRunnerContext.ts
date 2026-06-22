import { createContext } from 'react'
import type { WorkflowDefinition, WorkflowRun } from '@shared/contracts'

export interface WorkflowRunnerContextValue {
  liveRuns: Record<string, WorkflowRun>
  startRun: (workspaceId: string, definition: WorkflowDefinition) => Promise<WorkflowRun | null>
  resolveApproval: (runId: string, approved: boolean) => void
  cancelRun: (runId: string) => void
}

export const WorkflowRunnerContext = createContext<WorkflowRunnerContextValue | null>(null)
