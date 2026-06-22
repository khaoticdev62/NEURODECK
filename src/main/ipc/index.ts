import { app, type BrowserWindow } from 'electron'
import { join } from 'node:path'
import { FileService } from '../../core/files/FileService'
import { GitService } from '../../core/git/GitService'
import { RecoveryService } from '../../core/recovery/RecoveryService'
import { TerminalService } from '../../core/terminal/TerminalService'
import { WorkflowRunStore } from '../../core/workflows/WorkflowRunStore'
import { WorkflowStore } from '../../core/workflows/WorkflowStore'
import { WorkspaceStore } from '../../core/workspaces/WorkspaceStore'
import { registerFileHandlers } from './registerFileHandlers'
import { registerGitHandlers } from './registerGitHandlers'
import { registerRecoveryHandlers } from './registerRecoveryHandlers'
import { registerTerminalHandlers } from './registerTerminalHandlers'
import { registerWorkflowHandlers } from './registerWorkflowHandlers'
import { registerWorkspaceHandlers } from './registerWorkspaceHandlers'

/** Registers every real IPC handler. Called once from `src/main/index.ts` after `app.whenReady()`. */
export function registerIpcHandlers(getWindow: () => BrowserWindow | null): () => void {
  const workspaceStore = new WorkspaceStore(join(app.getPath('userData'), 'workspaces.json'))
  const fileService = new FileService()
  const gitService = new GitService()
  const terminalService = new TerminalService()
  const recoveryService = new RecoveryService(join(app.getPath('userData'), 'recovery'))
  const workflowStore = new WorkflowStore(join(app.getPath('userData'), 'workflows'))
  const workflowRunStore = new WorkflowRunStore(join(app.getPath('userData'), 'workflows'))

  registerWorkspaceHandlers(workspaceStore, getWindow)
  registerFileHandlers(fileService, recoveryService, workspaceStore)
  registerGitHandlers(gitService, workspaceStore)
  registerRecoveryHandlers(recoveryService, fileService, workspaceStore)
  registerWorkflowHandlers(workflowStore, workflowRunStore)
  return registerTerminalHandlers(terminalService, workspaceStore, getWindow)
}
