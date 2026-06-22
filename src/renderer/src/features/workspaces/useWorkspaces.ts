import { useContext } from 'react'
import { WorkspaceContext, type WorkspaceContextValue } from './WorkspaceContext'

export function useWorkspaces(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspaces must be used within a WorkspaceProvider')
  return context
}
