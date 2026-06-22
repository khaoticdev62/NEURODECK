import type { CpuInfo, NetworkInterfaceInfo } from 'node:os'
import { describe, expect, it } from 'vitest'
import {
  computeCpuUsagePercent,
  parseLinuxMeminfo,
  SystemMetricsService,
  type SystemMetricsDependencies
} from '../SystemMetricsService'

describe('SystemMetricsService', () => {
  it('collects real host CPU, memory, storage, network, and core health', async () => {
    const snapshot = await new SystemMetricsService().collect(process.cwd())

    expect(snapshot.cpu.available).toBe(true)
    expect(snapshot.cpu.value?.usagePercent).toBeGreaterThanOrEqual(0)
    expect(snapshot.cpu.value?.usagePercent).toBeLessThanOrEqual(100)
    expect(snapshot.memory.value?.totalBytes).toBeGreaterThan(0)
    expect(snapshot.storage.value?.totalBytes).toBeGreaterThan(0)
    expect(snapshot.core.pid).toBe(process.pid)
    expect(snapshot.collectedAt).toBeGreaterThan(0)
  })

  it('collects Linux procfs/sysfs capabilities without fabricating missing values', async () => {
    const dependencies = fakeLinuxDependencies()
    const snapshot = await new SystemMetricsService(dependencies).collect('/workspace')

    expect(snapshot.swap.value).toMatchObject({
      totalBytes: 2 * 1024 * 1024,
      availableBytes: 1024 * 1024,
      usagePercent: 50
    })
    expect(snapshot.battery.value?.[0]).toMatchObject({
      name: 'BAT0',
      capacityPercent: 72,
      status: 'Discharging'
    })
    expect(snapshot.thermal.value).toEqual([{ name: 'cpu', celsius: 42 }])
    expect(snapshot.fans.value).toEqual([{ name: 'steamdeck:fan1_input', rpm: 3100 }])
    expect(snapshot.gpu.value).toEqual([{ device: 'card0', usagePercent: 37 }])
    expect(snapshot.processes.value).toEqual([
      { pid: 42, name: 'ndx-core', residentBytes: 2048 * 1024 }
    ])
  })

  it('calculates CPU deltas and parses Linux memory fields deterministically', () => {
    const before = [cpu({ user: 100, nice: 0, sys: 50, idle: 750, irq: 0 })]
    const after = [cpu({ user: 200, nice: 0, sys: 100, idle: 800, irq: 0 })]
    expect(computeCpuUsagePercent(before, after)).toBe(75)
    expect(parseLinuxMeminfo('MemTotal: 1000 kB\nSwapTotal: 256 kB\n')).toMatchObject({
      MemTotal: 1000,
      SwapTotal: 256
    })
  })
})

function fakeLinuxDependencies(): SystemMetricsDependencies {
  const files: Record<string, string> = {
    '/virtual/proc/meminfo': 'SwapTotal: 2048 kB\nSwapFree: 1024 kB\n',
    '/virtual/sys/class/power_supply/BAT0/capacity': '72\n',
    '/virtual/sys/class/power_supply/BAT0/status': 'Discharging\n',
    '/virtual/sys/class/power_supply/BAT0/energy_now': '30000000\n',
    '/virtual/sys/class/power_supply/BAT0/energy_full': '40000000\n',
    '/virtual/sys/class/power_supply/BAT0/power_now': '12000000\n',
    '/virtual/sys/class/thermal/thermal_zone0/type': 'cpu\n',
    '/virtual/sys/class/thermal/thermal_zone0/temp': '42000\n',
    '/virtual/sys/class/hwmon/hwmon0/name': 'steamdeck\n',
    '/virtual/sys/class/hwmon/hwmon0/fan1_input': '3100\n',
    '/virtual/sys/class/drm/card0/device/gpu_busy_percent': '37\n',
    '/virtual/proc/42/comm': 'ndx-core\n',
    '/virtual/proc/42/status': 'Name:\tndx-core\nVmRSS:\t2048 kB\n'
  }
  const directories: Record<string, string[]> = {
    '/virtual/sys/class/power_supply': ['BAT0'],
    '/virtual/sys/class/thermal': ['thermal_zone0'],
    '/virtual/sys/class/hwmon': ['hwmon0'],
    '/virtual/sys/class/hwmon/hwmon0': ['name', 'fan1_input'],
    '/virtual/sys/class/drm': ['card0', 'renderD128'],
    '/virtual/proc': ['self', '42']
  }
  const cpuSnapshots = [
    [cpu({ user: 100, nice: 0, sys: 50, idle: 750, irq: 0 })],
    [cpu({ user: 150, nice: 0, sys: 75, idle: 775, irq: 0 })]
  ]
  return {
    platform: () => 'linux',
    cpus: () => cpuSnapshots.shift() ?? cpuSnapshots[0],
    totalmem: () => 8 * 1024 * 1024,
    freemem: () => 2 * 1024 * 1024,
    networkInterfaces: () => ({
      eth0: [networkAddress('IPv4', false), networkAddress('IPv6', false)]
    }),
    uptime: () => 123,
    pid: () => 99,
    readFile: async (path) => {
      const value = files[normalize(path)]
      if (value === undefined) throw new Error('missing')
      return value
    },
    readdir: async (path) => directories[normalize(path)] ?? [],
    statfs: async () => ({ bsize: 1024, blocks: 1000, bfree: 400, bavail: 350 }),
    wait: async () => undefined,
    root: '/virtual',
    now: () => 456
  }
}

function cpu(times: CpuInfo['times']): CpuInfo {
  return { model: 'Test CPU', speed: 3000, times }
}

function networkAddress(
  family: NetworkInterfaceInfo['family'],
  internal: boolean
): NetworkInterfaceInfo {
  return family === 'IPv4'
    ? {
        address: '192.0.2.1',
        netmask: '255.255.255.0',
        family: 'IPv4',
        mac: '00:00:00:00:00:00',
        internal,
        cidr: null
      }
    : {
        address: '2001:db8::1',
        netmask: 'ffff:ffff:ffff:ffff::',
        family: 'IPv6',
        mac: '00:00:00:00:00:00',
        internal,
        cidr: null,
        scopeid: 0
      }
}

function normalize(path: string): string {
  return path.replaceAll('\\', '/')
}
