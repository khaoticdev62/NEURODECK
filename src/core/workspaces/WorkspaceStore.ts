import { stat } from 'node:fs/promises'
import { basename } from 'node:path'
import type { Workspace } from '@shared/contracts/workspace'
import { JsonStore } from '../persistence/JsonStore'

interface WorkspaceFile {
  workspaces: Workspace[]
}

let sequence = 0

/**
 * Real workspace persistence (mega-prompt §19). A workspace today is just a
 * named, durable reference to a root folder that's been verified to exist —
 * the richer spec list (Git repos, sessions, branch, agent permissions, ...)
 * waits for the services that own that state.
 */
export class WorkspaceStore {
  private store: JsonStore<WorkspaceFile>

  constructor(filePath: string) {
    this.store = new JsonStore<WorkspaceFile>(filePath, { workspaces: [] })
  }

  async list(): Promise<Workspace[]> {
    return (await this.store.read()).workspaces
  }

  /** Verifies the folder really exists and is a directory before persisting it. */
  async create(rootPath: string): Promise<Workspace> {
    const info = await stat(rootPath)
    if (!info.isDirectory()) {
      throw new Error(`"${rootPath}" is not a directory.`)
    }

    const workspace: Workspace = {
      id: `workspace-${Date.now()}-${++sequence}`,
      name: basename(rootPath) || rootPath,
      rootPath,
      createdAt: Date.now()
    }

    const file = await this.store.read()
    await this.store.write({ workspaces: [...file.workspaces, workspace] })
    return workspace
  }

  async remove(id: string): Promise<void> {
    const file = await this.store.read()
    await this.store.write({
      workspaces: file.workspaces.filter((workspace) => workspace.id !== id)
    })
  }

  async get(id: string): Promise<Workspace | undefined> {
    return (await this.list()).find((workspace) => workspace.id === id)
  }
}
