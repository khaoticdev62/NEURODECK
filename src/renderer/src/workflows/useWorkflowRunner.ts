import { useContext } from 'react'
import { WorkflowRunnerContext, type WorkflowRunnerContextValue } from './WorkflowRunnerContext'

export function useWorkflowRunner(): WorkflowRunnerContextValue {
  const context = useContext(WorkflowRunnerContext)
  if (!context) throw new Error('useWorkflowRunner must be used within a WorkflowRunnerProvider')
  return context
}
