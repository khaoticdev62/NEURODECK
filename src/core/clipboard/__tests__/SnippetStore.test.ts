import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SnippetStore } from '../SnippetStore'

let dir: string
let store: SnippetStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-snippets-'))
  store = new SnippetStore(join(dir, 'snippets.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('SnippetStore', () => {
  it('starts empty', async () => {
    expect(await store.list()).toEqual([])
  })

  it('detects real {{variable}} placeholders from content at save time', async () => {
    const snippet = await store.upsert({
      id: 'greet',
      name: 'Greeting',
      type: 'text',
      content: 'Hello {{name}}, welcome to {{workspace}}.'
    })

    expect(snippet.variables.sort()).toEqual(['name', 'workspace'])
  })

  it('attaches a real risk classification to shell snippets only', async () => {
    const shell = await store.upsert({
      id: 'cleanup',
      name: 'Cleanup',
      type: 'shell',
      content: 'rm -rf {{path}}'
    })
    const text = await store.upsert({
      id: 'note',
      name: 'Note',
      type: 'text',
      content: 'just text'
    })

    expect(shell.riskLevel).toBe('high')
    expect(text.riskLevel).toBeUndefined()
  })

  it('render() substitutes real provided values', async () => {
    await store.upsert({ id: 'greet', name: 'Greeting', type: 'text', content: 'Hello {{name}}!' })

    const rendered = await store.render('greet', { name: 'Ada' })

    expect(rendered?.text).toBe('Hello Ada!')
    expect(rendered?.missingVariables).toEqual([])
  })

  it('render() honestly reports missing variables rather than silently leaving placeholders', async () => {
    await store.upsert({ id: 'greet', name: 'Greeting', type: 'text', content: 'Hello {{name}}!' })

    const rendered = await store.render('greet', {})

    expect(rendered?.text).toBe('Hello {{name}}!')
    expect(rendered?.missingVariables).toEqual(['name'])
  })

  it('render() returns undefined for an unknown snippet id', async () => {
    expect(await store.render('missing', {})).toBeUndefined()
  })

  it('removes a snippet', async () => {
    await store.upsert({ id: 'temp', name: 'Temp', type: 'text', content: 'x' })
    expect(await store.remove('temp')).toBe(true)
    expect(await store.list()).toEqual([])
  })
})
