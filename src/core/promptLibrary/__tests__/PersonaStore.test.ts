import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { UpsertPersonaRequest } from '@shared/contracts'
import { PersonaStore } from '../PersonaStore'

let dir: string
let store: PersonaStore

const sample: UpsertPersonaRequest = {
  id: 'persona-1',
  name: 'Concise Reviewer',
  communicationStyle: 'Terse, bullet points only',
  explanationDepth: 'concise',
  suggestedToolIds: [],
  reviewStrictness: 'strict'
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-personas-'))
  store = new PersonaStore(join(dir, 'personas.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('PersonaStore', () => {
  it('starts empty', async () => {
    expect(await store.list()).toEqual([])
  })

  it('upserts a new persona', async () => {
    const record = await store.upsert(sample)
    expect(record.reviewStrictness).toBe('strict')
    expect(await store.list()).toEqual([record])
  })

  it('removes a persona', async () => {
    await store.upsert(sample)
    expect(await store.remove('persona-1')).toBe(true)
    expect(await store.list()).toEqual([])
  })
})
