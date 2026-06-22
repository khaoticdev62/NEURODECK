import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type { SaveWorkflowRequest, WorkflowDefinition } from '@shared/contracts/workflow'
import { JsonStore } from '../persistence/JsonStore'

interface WorkflowIndex {
  workflows: WorkflowDefinition[]
}

/** Real, versioned workflow definitions (mega-prompt §25 "Versioned workflow definitions"), persisted per workspace under `app.getPath('userData')`. */
export class WorkflowStore {
  constructor(private baseDir: string) {}

  private store(workspaceId: string): JsonStore<WorkflowIndex> {
    return new JsonStore<WorkflowIndex>(join(this.baseDir, workspaceId, 'workflows.json'), {
      workflows: []
    })
  }

  async list(workspaceId: string): Promise<WorkflowDefinition[]> {
    return (await this.store(workspaceId).read()).workflows
  }

  async get(workspaceId: string, workflowId: string): Promise<WorkflowDefinition | undefined> {
    return (await this.list(workspaceId)).find((workflow) => workflow.id === workflowId)
  }

  async save(request: SaveWorkflowRequest): Promise<WorkflowDefinition> {
    const store = this.store(request.workspaceId)
    const index = await store.read()
    const now = Date.now()

    if (request.id) {
      const existing = index.workflows.find((workflow) => workflow.id === request.id)
      if (existing) {
        const updated: WorkflowDefinition = {
          ...existing,
          name: request.name,
          description: request.description,
          steps: request.steps,
          version: existing.version + 1,
          updatedAt: now
        }
        await store.write({
          workflows: index.workflows.map((workflow) =>
            workflow.id === request.id ? updated : workflow
          )
        })
        return updated
      }
    }

    const created: WorkflowDefinition = {
      id: request.id ?? randomUUID(),
      workspaceId: request.workspaceId,
      name: request.name,
      description: request.description,
      steps: request.steps,
      version: 1,
      createdAt: now,
      updatedAt: now
    }
    await store.write({ workflows: [...index.workflows, created] })
    return created
  }

  async remove(workspaceId: string, workflowId: string): Promise<void> {
    const store = this.store(workspaceId)
    const index = await store.read()
    await store.write({
      workflows: index.workflows.filter((workflow) => workflow.id !== workflowId)
    })
  }
}
