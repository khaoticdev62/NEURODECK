import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { UpsertPromptTemplateRequest } from '@shared/contracts'
import { PromptTemplateStore } from '../PromptTemplateStore'

let dir: string
let store: PromptTemplateStore

const sample: UpsertPromptTemplateRequest = {
  id: 'tmpl-1',
  name: 'Summarize PR',
  purpose: 'Summarize a pull request diff',
  inputs: ['diff'],
  requiredTools: [],
  workspaceScoped: false,
  riskClass: 'low',
  version: '1.0.0',
  author: 'demo',
  testCases: []
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-prompt-templates-'))
  store = new PromptTemplateStore(join(dir, 'prompts.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('PromptTemplateStore', () => {
  it('starts empty', async () => {
    expect(await store.list()).toEqual([])
  })

  it('upserts a new template and stamps timestamps', async () => {
    const record = await store.upsert(sample)
    expect(record.createdAt).toBe(record.updatedAt)
    expect(await store.list()).toEqual([record])
  })

  it('upserting the same id preserves createdAt', async () => {
    const first = await store.upsert(sample)
    const second = await store.upsert({ ...sample, name: 'Summarize PR v2' })
    expect(second.createdAt).toBe(first.createdAt)
    expect(second.name).toBe('Summarize PR v2')
  })

  it('removes a template', async () => {
    await store.upsert(sample)
    expect(await store.remove('tmpl-1')).toBe(true)
    expect(await store.list()).toEqual([])
  })

  it('remove() returns false for an unknown id', async () => {
    expect(await store.remove('missing')).toBe(false)
  })
})
