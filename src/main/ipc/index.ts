import { app, type BrowserWindow } from 'electron'
import { join } from 'node:path'
import { FileService } from '../../core/files/FileService'
import { GitService } from '../../core/git/GitService'
import { TerminalService } from '../../core/terminal/TerminalService'
import { WorkspaceStore } from '../../core/workspaces/WorkspaceStore'
import { registerFileHandlers } from './registerFileHandlers'
import { registerGitHandlers } from './registerGitHandlers'
import { registerTerminalHandlers } from './registerTerminalHandlers'
import { registerWorkspaceHandlers } from './registerWorkspaceHandlers'

/** Registers every real IPC handler. Called once from `src/main/index.ts` after `app.whenReady()`. */
export function registerIpcHandlers(getWindow: () => BrowserWindow | null): () => void {
  const workspaceStore = new WorkspaceStore(join(app.getPath('userData'), 'workspaces.json'))
  const fileService = new FileService()
  const gitService = new GitService()
  const terminalService = new TerminalService()

  registerWorkspaceHandlers(workspaceStore, getWindow)
  registerFileHandlers(fileService, workspaceStore)
  registerGitHandlers(gitService, workspaceStore)
  return registerTerminalHandlers(terminalService, workspaceStore, getWindow)
}
