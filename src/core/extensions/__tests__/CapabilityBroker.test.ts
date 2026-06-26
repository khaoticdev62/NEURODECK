import { describe, expect, it, vi } from 'vitest'
import { CapabilityBroker } from '../CapabilityBroker'

describe('CapabilityBroker', () => {
  it('denies a capability call that was never granted, even with a real handler registered', async () => {
    const broker = new CapabilityBroker()
    broker.register('show-notification', vi.fn().mockResolvedValue('ok'))

    await expect(broker.call('ext-1', [], 'show-notification', 'show', {})).rejects.toThrow(
      /not granted/
    )
  })

  it('denies a granted capability with no real handler implemented', async () => {
    const broker = new CapabilityBroker()

    await expect(
      broker.call('ext-1', ['show-notification'], 'show-notification', 'show', {})
    ).rejects.toThrow(/no real handler/)
  })

  it('dispatches to the real handler when the capability is both granted and implemented', async () => {
    const broker = new CapabilityBroker()
    const handler = vi.fn().mockResolvedValue({ shown: true })
    broker.register('show-notification', handler)

    const result = await broker.call('ext-1', ['show-notification'], 'show-notification', 'show', {
      title: 'Hello'
    })

    expect(result).toEqual({ shown: true })
    expect(handler).toHaveBeenCalledWith({
      extensionId: 'ext-1',
      method: 'show',
      args: { title: 'Hello' }
    })
  })
})
