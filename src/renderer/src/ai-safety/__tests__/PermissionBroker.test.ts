import { describe, expect, it } from 'vitest'
import { PermissionBroker } from '../PermissionBroker'

describe('PermissionBroker', () => {
  it('requires approval for a capability with no prior grant', () => {
    const broker = new PermissionBroker()
    expect(broker.evaluate('system.changeSettings')).toBe('requires-approval')
  })

  it('reports granted once a capability has been granted', () => {
    const broker = new PermissionBroker()
    broker.grant('system.changeSettings', 'session')
    expect(broker.evaluate('system.changeSettings')).toBe('granted')
  })

  it('revoking a capability makes it require approval again', () => {
    const broker = new PermissionBroker()
    broker.grant('system.changeSettings', 'persistent')
    broker.revoke('system.changeSettings')
    expect(broker.evaluate('system.changeSettings')).toBe('requires-approval')
  })

  it('consumes a "once" grant after use, but leaves "session" grants intact', () => {
    const broker = new PermissionBroker()
    broker.grant('system.changeSettings', 'once')
    broker.consumeIfOnce('system.changeSettings')
    expect(broker.evaluate('system.changeSettings')).toBe('requires-approval')

    broker.grant('network.request', 'session')
    broker.consumeIfOnce('network.request')
    expect(broker.evaluate('network.request')).toBe('granted')
  })

  it('lists currently held grants', () => {
    const broker = new PermissionBroker()
    broker.grant('system.changeSettings', 'session')
    expect(broker.listGrants()).toHaveLength(1)
    expect(broker.listGrants()[0].capability).toBe('system.changeSettings')
  })
})
