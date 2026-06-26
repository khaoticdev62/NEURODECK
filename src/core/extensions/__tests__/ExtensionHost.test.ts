import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExtensionRecord } from '@shared/contracts'
import { CapabilityBroker } from '../CapabilityBroker'
import { ExtensionHost } from '../ExtensionHost'

const FIXTURE_PATH = join(__dirname, 'fixtures', 'fakeExtensionHostEntry.cjs')

function record(overrides: Partial<ExtensionRecord> = {}): ExtensionRecord {
  return {
    manifest: {
      schemaVersion: '1',
      id: 'ext.demo',
      name: 'Demo',
      version: '1.0.0',
      publisher: 'demo',
      description: 'demo',
      type: 'command',
      entrypoints: { main: 'index.js' },
      capabilities: [],
      minimumNdxVersion: '0.1.0',
      supportedPlatforms: []
    },
    installPath: '/tmp/ext-demo',
    state: 'enabled',
    trust: 'unsigned',
    grantedCapabilities: ['show-notification'],
    faultCount: 0,
    installedAt: 1,
    updatedAt: 1,
    ...overrides
  }
}

let host: ExtensionHost | undefined

afterEach(() => {
  if (host) {
    for (const id of ['ext.demo']) host.stop(id)
  }
  host = undefined
})

describe('ExtensionHost', () => {
  it('forks a real, separate child process and reports real activation', async () => {
    const onActivated = vi.fn()
    const broker = new CapabilityBroker()
    host = new ExtensionHost(FIXTURE_PATH, broker, { onFault: vi.fn(), onActivated })

    host.start(record())

    await vi.waitFor(() => expect(onActivated).toHaveBeenCalledWith('ext.demo'))
    expect(host.isRunning('ext.demo')).toBe(true)
  })

  it('reports a real fault when the extension fails to activate', async () => {
    const onFault = vi.fn()
    const broker = new CapabilityBroker()
    host = new ExtensionHost(FIXTURE_PATH, broker, { onFault })

    host.start(record({ manifest: { ...record().manifest, entrypoints: { main: 'crash.js' } } }))

    await vi.waitFor(() =>
      expect(onFault).toHaveBeenCalledWith('ext.demo', 'Simulated activation crash.', 1)
    )
  })

  it('dispatches a real capability call through the broker and returns the result over real IPC', async () => {
    const broker = new CapabilityBroker()
    const handler = vi.fn().mockResolvedValue({ shown: true })
    broker.register('show-notification', handler)
    const onCapabilityCallHandled = vi.fn()
    host = new ExtensionHost(FIXTURE_PATH, broker, { onFault: vi.fn(), onCapabilityCallHandled })

    host.start(
      record({ manifest: { ...record().manifest, entrypoints: { main: 'call-capability.js' } } })
    )

    await vi.waitFor(() =>
      expect(onCapabilityCallHandled).toHaveBeenCalledWith('ext.demo', 'show-notification', true)
    )
    expect(handler).toHaveBeenCalledWith({
      extensionId: 'ext.demo',
      method: 'show',
      args: { title: 'Hello from fixture' }
    })
  })

  it('reports a denied capability call as a real failed round trip, not a silent drop', async () => {
    const broker = new CapabilityBroker() // no handlers registered, no grants
    const onCapabilityCallHandled = vi.fn()
    host = new ExtensionHost(FIXTURE_PATH, broker, { onFault: vi.fn(), onCapabilityCallHandled })

    host.start(
      record({
        grantedCapabilities: [],
        manifest: { ...record().manifest, entrypoints: { main: 'call-capability.js' } }
      })
    )

    await vi.waitFor(() =>
      expect(onCapabilityCallHandled).toHaveBeenCalledWith('ext.demo', 'show-notification', false)
    )
  })

  it('stops a real child process and removes it from the running set', async () => {
    const broker = new CapabilityBroker()
    host = new ExtensionHost(FIXTURE_PATH, broker, { onFault: vi.fn() })
    const testRecord = record()
    host.start(testRecord)
    await vi.waitFor(() => expect(host?.isRunning('ext.demo')).toBe(true))

    host.stop('ext.demo')

    await vi.waitFor(() => expect(host?.isRunning('ext.demo')).toBe(false))
  })

  it('accumulates real fault counts within the rolling window across repeated faults', async () => {
    const onFault = vi.fn()
    const broker = new CapabilityBroker()
    host = new ExtensionHost(FIXTURE_PATH, broker, { onFault })

    host.start(
      record({ manifest: { ...record().manifest, entrypoints: { main: 'crash-twice.js' } } })
    )

    await vi.waitFor(() => expect(onFault).toHaveBeenCalledTimes(2))
    expect(onFault).toHaveBeenLastCalledWith('ext.demo', 'Simulated activation crash.', 2)
  })
})
