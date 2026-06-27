import { networkInterfaces } from 'node:os'
import type { LanShareInterfaceType, LanShareNetworkInterface } from '@shared/contracts'

/**
 * Real network interface enumeration for LAN Share (spec §5 "Interface
 * Manager"). Only the parts Node's standard library can genuinely
 * verify are reported: name, address, address family, and a
 * best-effort type guess from the OS-given interface name. Default
 * route, multicast support, and VPN state (spec §22) need real
 * platform-specific routing-table/VPN probes this phase does not build
 * — that work belongs to Phase LAN-9, which owns "Network Interfaces
 * and VPN" in the spec's own phase breakdown.
 */
export class LanShareInterfaceManager {
  list(): LanShareNetworkInterface[] {
    const interfaces = networkInterfaces()
    const result: LanShareNetworkInterface[] = []

    for (const [name, addresses] of Object.entries(interfaces)) {
      if (!addresses) continue
      for (const address of addresses) {
        if (address.internal) continue
        result.push({
          id: `${name}/${address.address}`,
          name,
          address: address.address,
          family: address.family === 'IPv6' ? 'IPv6' : 'IPv4',
          inferredType: inferInterfaceType(name)
        })
      }
    }

    return result
  }
}

function inferInterfaceType(name: string): LanShareInterfaceType {
  const normalized = name.toLowerCase()
  if (normalized.includes('wl') || normalized.includes('wi-fi') || normalized.includes('wifi')) {
    return 'wifi'
  }
  if (normalized.includes('eth') || normalized.includes('en') || normalized === 'ethernet') {
    return 'ethernet'
  }
  return 'unknown'
}
