import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WorkflowRunStore } from '../WorkflowRunStore'

let dir: string
let store: WorkflowRunStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-workflow-run-'))
  store = new WorkflowRunStore(dir)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('WorkflowRunStore', () => {
  it('starts with no runs', async () => {
    expect(await store.list('w1')).toEqual([])
  })

  it('creates a real run in the running state', async () => {
    const run = await store.create('w1', 'wf1')

    expect(run.status).toBe('running')
    expect(run.workflowId).toBe('wf1')
    expect(await store.get('w1', run.id)).toEqual(run)
  })

  it('updates a run in place', async () => {
    const run = await store.create('w1', 'wf1')
    await store.update('w1', { ...run, status: 'passed', finishedAt: Date.now() })

    const updated = await store.get('w1', run.id)
    expect(updated?.status).toBe('passed')
  })

  it('lists runs newest first', async () => {
    const first = await store.create('w1', 'wf1')
    const second = await store.create('w1', 'wf1')

    const runs = await store.list('w1')
    expect(runs.map((run) => run.id)).toEqual([second.id, first.id])
  })

  it('keeps workspaces isolated', async () => {
    await store.create('w1', 'wf1')
    expect(await store.list('w2')).toEqual([])
  })
})
