import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MicrophonePermissionStore } from '../MicrophonePermissionStore'

let dir: string
let store: MicrophonePermissionStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-mic-permission-'))
  store = new MicrophonePermissionStore(join(dir, 'microphone.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('MicrophonePermissionStore', () => {
  it('starts not-determined, fails closed rather than defaulting to granted', async () => {
    expect(await store.getStatus()).toBe('not-determined')
    expect(await store.isGranted()).toBe(false)
  })

  it('persists a real granted choice', async () => {
    await store.setGranted(true)
    expect(await store.getStatus()).toBe('granted')
    expect(await store.isGranted()).toBe(true)
  })

  it('persists a real denied choice', async () => {
    await store.setGranted(false)
    expect(await store.getStatus()).toBe('denied')
    expect(await store.isGranted()).toBe(false)
  })

  it('a fresh store instance over the same file sees the same persisted choice', async () => {
    await store.setGranted(true)
    const reopened = new MicrophonePermissionStore(join(dir, 'microphone.json'))
    expect(await reopened.getStatus()).toBe('granted')
  })
})
