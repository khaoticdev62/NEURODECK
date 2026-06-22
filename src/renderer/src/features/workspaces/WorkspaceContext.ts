import { createContext } from 'react'
import type { Workspace } from '@shared/contracts'

export interface WorkspaceContextValue {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  activeWorkspace: Workspace | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addFromPicker: () => Promise<void>
  remove: (id: string) => Promise<void>
  setActive: (id: string) => void
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
