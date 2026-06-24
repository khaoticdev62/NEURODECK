import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { JsonStore } from '../JsonStore'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-jsonstore-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('JsonStore', () => {
  it('returns the default value when the file does not exist yet', async () => {
    const store = new JsonStore<string[]>(join(dir, 'list.json'), [])
    expect(await store.read()).toEqual([])
  })

  it('writes and reads back real JSON from a real file', async () => {
    const store = new JsonStore<{ items: string[] }>(join(dir, 'data.json'), { items: [] })
    await store.write({ items: ['a', 'b'] })

    expect(await store.read()).toEqual({ items: ['a', 'b'] })
  })

  it('creates parent directories that do not exist yet', async () => {
    const nestedPath = join(dir, 'nested', 'deep', 'data.json')
    const store = new JsonStore<{ value: number }>(nestedPath, { value: 0 })

    await store.write({ value: 42 })

    expect(JSON.parse(await readFile(nestedPath, 'utf-8'))).toEqual({ value: 42 })
  })

  it('does not leave a temp file behind after a successful write', async () => {
    const store = new JsonStore<{ value: number }>(join(dir, 'data.json'), { value: 0 })
    await store.write({ value: 1 })

    const { readdir } = await import('node:fs/promises')
    const files = await readdir(dir)
    expect(files).toEqual(['data.json'])
  })

  it('overwrites the previous value entirely rather than merging', async () => {
    const store = new JsonStore<{ a?: number; b?: number }>(join(dir, 'data.json'), {})
    await store.write({ a: 1 })
    await store.write({ b: 2 })

    expect(await store.read()).toEqual({ b: 2 })
  })

  it('self-heals from a genuinely corrupted file instead of throwing', async () => {
    const filePath = join(dir, 'data.json')
    await writeFile(filePath, '{ this is not valid json', 'utf-8')
    const store = new JsonStore<{ items: string[] }>(filePath, { items: [] })

    expect(await store.read()).toEqual({ items: [] })

    const files = await readdir(dir)
    expect(files).not.toContain('data.json')
    expect(files.some((file) => file.startsWith('data.json.corrupted-'))).toBe(true)
  })

  it('writes normally again after self-healing from corruption', async () => {
    const filePath = join(dir, 'data.json')
    await writeFile(filePath, 'not json at all', 'utf-8')
    const store = new JsonStore<{ items: string[] }>(filePath, { items: [] })
    await store.read()

    await store.write({ items: ['recovered'] })

    expect(await store.read()).toEqual({ items: ['recovered'] })
  })
})
