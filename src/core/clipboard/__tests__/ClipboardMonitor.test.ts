import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SecretCipher } from '../../models/SecretCipher'
import { ClipboardStore } from '../ClipboardStore'
import { ClipboardMonitor } from '../ClipboardMonitor'

let dir: string

function fakeCipher(): SecretCipher {
  return {
    isAvailable: () => true,
    encrypt: (plaintext) => `ENC(${plaintext})`,
    decrypt: (ciphertext) => ciphertext.replace(/^ENC\(/, '').replace(/\)$/, '')
  }
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-clipboard-monitor-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('ClipboardMonitor', () => {
  it('adds a real store entry the first time it sees non-empty clipboard text', async () => {
    const store = new ClipboardStore(join(dir, 'clipboard.json'), fakeCipher())
    const monitor = new ClipboardMonitor(store, () => 'hello from the OS clipboard')

    await monitor.tick()

    const entries = await store.list()
    expect(entries).toHaveLength(1)
    expect(entries[0].content).toBe('hello from the OS clipboard')
  })

  it('never adds a duplicate entry for the same unchanged clipboard text', async () => {
    const store = new ClipboardStore(join(dir, 'clipboard.json'), fakeCipher())
    const monitor = new ClipboardMonitor(store, () => 'same text every time')

    await monitor.tick()
    await monitor.tick()
    await monitor.tick()

    expect(await store.list()).toHaveLength(1)
  })

  it('adds a new entry once the real clipboard content changes', async () => {
    const store = new ClipboardStore(join(dir, 'clipboard.json'), fakeCipher())
    let current = 'first value'
    const monitor = new ClipboardMonitor(store, () => current)

    await monitor.tick()
    current = 'second value'
    await monitor.tick()

    const entries = await store.list()
    expect(entries).toHaveLength(2)
    expect(entries.map((entry) => entry.content).sort()).toEqual(['first value', 'second value'])
  })

  it('never adds an empty clipboard read', async () => {
    const store = new ClipboardStore(join(dir, 'clipboard.json'), fakeCipher())
    const monitor = new ClipboardMonitor(store, () => '')

    await monitor.tick()

    expect(await store.list()).toEqual([])
  })

  it('respects the real monitoring-disabled flag already enforced by ClipboardStore.add()', async () => {
    const store = new ClipboardStore(join(dir, 'clipboard.json'), fakeCipher())
    await store.setMonitoringEnabled(false)
    const monitor = new ClipboardMonitor(store, () => 'should not be captured')

    await monitor.tick()

    expect(await store.list()).toEqual([])
  })
})
