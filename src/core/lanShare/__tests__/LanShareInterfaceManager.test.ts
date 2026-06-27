import { describe, expect, it } from 'vitest'
import { LanShareInterfaceManager } from '../LanShareInterfaceManager'

describe('LanShareInterfaceManager', () => {
  it('lists only non-internal interfaces with a real address and family', () => {
    const manager = new LanShareInterfaceManager()
    const interfaces = manager.list()
    for (const iface of interfaces) {
      expect(iface.address.length).toBeGreaterThan(0)
      expect(['IPv4', 'IPv6']).toContain(iface.family)
      expect(['wifi', 'ethernet', 'unknown']).toContain(iface.inferredType)
      expect(iface.id).toBe(`${iface.name}/${iface.address}`)
    }
  })

  it('never reports a loopback interface', () => {
    const manager = new LanShareInterfaceManager()
    const interfaces = manager.list()
    expect(interfaces.some((iface) => iface.address === '127.0.0.1')).toBe(false)
  })
})
