import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type { WorkflowRun } from '@shared/contracts/workflow'
import { JsonStore } from '../persistence/JsonStore'

interface WorkflowRunIndex {
  runs: WorkflowRun[]
}

const MAX_RUNS_PER_WORKSPACE = 100

/** Real run history (mega-prompt §25 "Run history"), persisted per workspace. The renderer-side `WorkflowEngine` owns execution; this store only records state. */
export class WorkflowRunStore {
  constructor(private baseDir: string) {}

  private store(workspaceId: string): JsonStore<WorkflowRunIndex> {
    return new JsonStore<WorkflowRunIndex>(join(this.baseDir, workspaceId, 'workflow-runs.json'), {
      runs: []
    })
  }

  async list(workspaceId: string): Promise<WorkflowRun[]> {
    return (await this.store(workspaceId).read()).runs
  }

  async get(workspaceId: string, runId: string): Promise<WorkflowRun | undefined> {
    return (await this.list(workspaceId)).find((run) => run.id === runId)
  }

  async create(workspaceId: string, workflowId: string): Promise<WorkflowRun> {
    const run: WorkflowRun = {
      id: randomUUID(),
      workflowId,
      workspaceId,
      status: 'running',
      steps: [],
      context: {},
      startedAt: Date.now()
    }
    const store = this.store(workspaceId)
    const index = await store.read()
    const runs = [run, ...index.runs].slice(0, MAX_RUNS_PER_WORKSPACE)
    await store.write({ runs })
    return run
  }

  async update(workspaceId: string, run: WorkflowRun): Promise<void> {
    const store = this.store(workspaceId)
    const index = await store.read()
    await store.write({
      runs: index.runs.map((candidate) => (candidate.id === run.id ? run : candidate))
    })
  }
}
