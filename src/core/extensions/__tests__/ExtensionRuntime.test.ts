import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExtensionRuntime } from '../ExtensionRuntime'
import { ExtensionStore } from '../ExtensionStore'

let dir: string
let store: ExtensionStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-extension-runtime-'))
  store = new ExtensionStore(join(dir, 'extensions.json'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const MANIFEST = {
  schemaVersion: '1',
  id: 'ext.demo',
  name: 'Demo',
  version: '1.0.0',
  publisher: 'demo',
  description: 'demo',
  type: 'command',
  entrypoints: { main: 'index.js' },
  capabilities: [{ capability: 'show-notification', reason: 'Notify the user.' }],
  minimumNdxVersion: '0.1.0',
  supportedPlatforms: []
}

function fakeHost(): { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> } {
  return { start: vi.fn(), stop: vi.fn() }
}

describe('ExtensionRuntime', () => {
  it('install() validates a real manifest and only grants capabilities both requested and approved', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const notify = vi.fn()
    const runtime = new ExtensionRuntime(store, host as never, notify)

    const record = await runtime.install({
      directoryPath: dir,
      approvedCapabilities: ['show-notification', 'network-access']
    })

    expect(record.grantedCapabilities).toEqual(['show-notification'])
    expect(record.state).toBe('installed')
    expect(notify).toHaveBeenCalledWith(record)
    expect(await store.get('ext.demo')).toEqual(record)
  })

  it('install() rejects an invalid manifest and does not persist anything', async () => {
    const host = fakeHost()
    const runtime = new ExtensionRuntime(store, host as never, vi.fn())

    await expect(
      runtime.install({ directoryPath: dir, approvedCapabilities: [] })
    ).rejects.toThrow()
    expect(await store.list()).toEqual([])
  })

  it('setEnabled(true) starts the real host and persists the enabled state', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const runtime = new ExtensionRuntime(store, host as never, vi.fn())
    await runtime.install({ directoryPath: dir, approvedCapabilities: ['show-notification'] })

    const updated = await runtime.setEnabled('ext.demo', true)

    expect(updated.state).toBe('enabled')
    expect(host.start).toHaveBeenCalledTimes(1)
  })

  it('setEnabled(false) stops the real host and persists the disabled state', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const runtime = new ExtensionRuntime(store, host as never, vi.fn())
    await runtime.install({ directoryPath: dir, approvedCapabilities: [] })
    await runtime.setEnabled('ext.demo', true)

    const updated = await runtime.setEnabled('ext.demo', false)

    expect(updated.state).toBe('disabled')
    expect(host.stop).toHaveBeenCalledWith('ext.demo')
  })

  it('refuses to re-enable a quarantined extension without an explicit clear first', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const runtime = new ExtensionRuntime(store, host as never, vi.fn())
    await runtime.install({ directoryPath: dir, approvedCapabilities: [] })
    await runtime.handleFault('ext.demo', 'boom', 3)

    expect((await store.get('ext.demo'))?.state).toBe('quarantined')
    await expect(runtime.setEnabled('ext.demo', true)).rejects.toThrow(/explicitly cleared/)
  })

  it('handleFault() quarantines and stops the host once the real threshold is crossed', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const notify = vi.fn()
    const runtime = new ExtensionRuntime(store, host as never, notify)
    await runtime.install({ directoryPath: dir, approvedCapabilities: [] })

    await runtime.handleFault('ext.demo', 'first', 1)
    expect((await store.get('ext.demo'))?.state).toBe('installed')
    expect(host.stop).not.toHaveBeenCalled()

    await runtime.handleFault('ext.demo', 'third', 3)

    const record = await store.get('ext.demo')
    expect(record?.state).toBe('quarantined')
    expect(record?.quarantineReason).toMatch(/Automatically quarantined/)
    expect(host.stop).toHaveBeenCalledWith('ext.demo')
  })

  it('clearQuarantine() resets fault state to disabled without restoring capabilities automatically', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const runtime = new ExtensionRuntime(store, host as never, vi.fn())
    await runtime.install({ directoryPath: dir, approvedCapabilities: ['show-notification'] })
    await runtime.handleFault('ext.demo', 'boom', 3)

    const cleared = await runtime.clearQuarantine('ext.demo')

    expect(cleared.state).toBe('disabled')
    expect(cleared.faultCount).toBe(0)
    expect(cleared.quarantineReason).toBeUndefined()
    expect(cleared.grantedCapabilities).toEqual(['show-notification'])
  })

  it('remove() stops the real host and deletes the persisted record', async () => {
    await writeFile(join(dir, 'manifest.json'), JSON.stringify(MANIFEST), 'utf-8')
    const host = fakeHost()
    const runtime = new ExtensionRuntime(store, host as never, vi.fn())
    await runtime.install({ directoryPath: dir, approvedCapabilities: [] })

    await runtime.remove('ext.demo')

    expect(host.stop).toHaveBeenCalledWith('ext.demo')
    expect(await store.get('ext.demo')).toBeUndefined()
  })
})
