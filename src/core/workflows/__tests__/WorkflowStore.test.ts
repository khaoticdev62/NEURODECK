import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { WorkflowStep } from '@shared/contracts/workflow'
import { WorkflowStore } from '../WorkflowStore'

let dir: string
let store: WorkflowStore

const steps: WorkflowStep[] = [{ id: 's1', kind: 'output', title: 'Done', variable: 'result' }]

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-workflow-'))
  store = new WorkflowStore(dir)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('WorkflowStore', () => {
  it('starts with no workflows', async () => {
    expect(await store.list('w1')).toEqual([])
  })

  it('creates a real versioned workflow', async () => {
    const created = await store.save({
      workspaceId: 'w1',
      name: 'Quality Gate',
      description: '',
      steps
    })

    expect(created.version).toBe(1)
    expect(created.name).toBe('Quality Gate')
    expect(await store.list('w1')).toEqual([created])
  })

  it('updates an existing workflow and bumps its version', async () => {
    const created = await store.save({
      workspaceId: 'w1',
      name: 'Quality Gate',
      description: '',
      steps
    })

    const updated = await store.save({
      workspaceId: 'w1',
      id: created.id,
      name: 'Quality Gate v2',
      description: 'updated',
      steps
    })

    expect(updated.id).toBe(created.id)
    expect(updated.version).toBe(2)
    expect(await store.list('w1')).toEqual([updated])
  })

  it('removes a workflow', async () => {
    const created = await store.save({
      workspaceId: 'w1',
      name: 'Quality Gate',
      description: '',
      steps
    })
    await store.remove('w1', created.id)

    expect(await store.list('w1')).toEqual([])
  })

  it('keeps workspaces isolated', async () => {
    await store.save({ workspaceId: 'w1', name: 'Quality Gate', description: '', steps })
    expect(await store.list('w2')).toEqual([])
  })
})
