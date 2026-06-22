import { readdir, readFile, statfs } from 'node:fs/promises'
import {
  cpus,
  freemem,
  networkInterfaces,
  platform,
  totalmem,
  uptime,
  type CpuInfo,
  type NetworkInterfaceInfo
} from 'node:os'
import { join, parse } from 'node:path'

export interface MetricValue<T> {
  available: boolean
  value?: T
  source: string
  reason?: string
}

export interface CpuMetrics {
  usagePercent: number
  logicalCores: number
  model: string
}

export interface MemoryMetrics {
  totalBytes: number
  usedBytes: number
  availableBytes: number
  usagePercent: number
}

export interface StorageMetrics {
  path: string
  totalBytes: number
  usedBytes: number
  availableBytes: number
  usagePercent: number
}

export interface BatteryMetrics {
  name: string
  capacityPercent: number | null
  status: string | null
  energyNowMicrowattHours: number | null
  energyFullMicrowattHours: number | null
  powerNowMicrowatts: number | null
}

export interface TemperatureSensor {
  name: string
  celsius: number
}

export interface FanSensor {
  name: string
  rpm: number
}

export interface GpuMetrics {
  device: string
  usagePercent: number
}

export interface NetworkInterfaceSummary {
  name: string
  addressCount: number
  internal: boolean
  families: string[]
}

export interface ProcessSummary {
  pid: number
  name: string
  residentBytes: number | null
}

export interface SystemMetricsSnapshot {
  collectedAt: number
  hostPlatform: string
  core: { pid: number; uptimeSeconds: number }
  cpu: MetricValue<CpuMetrics>
  memory: MetricValue<MemoryMetrics>
  swap: MetricValue<MemoryMetrics>
  storage: MetricValue<StorageMetrics>
  battery: MetricValue<BatteryMetrics[]>
  thermal: MetricValue<TemperatureSensor[]>
  fans: MetricValue<FanSensor[]>
  gpu: MetricValue<GpuMetrics[]>
  network: MetricValue<NetworkInterfaceSummary[]>
  processes: MetricValue<ProcessSummary[]>
}

interface StatFsResult {
  bsize: number
  blocks: number
  bfree: number
  bavail: number
}

export interface SystemMetricsDependencies {
  platform: () => NodeJS.Platform
  cpus: () => CpuInfo[]
  totalmem: () => number
  freemem: () => number
  networkInterfaces: () => NodeJS.Dict<NetworkInterfaceInfo[]>
  uptime: () => number
  pid: () => number
  readFile: (path: string) => Promise<string>
  readdir: (path: string) => Promise<string[]>
  statfs: (path: string) => Promise<StatFsResult>
  wait: (milliseconds: number) => Promise<void>
  root: string
  now: () => number
}

const DEFAULT_DEPENDENCIES: SystemMetricsDependencies = {
  platform,
  cpus,
  totalmem,
  freemem,
  networkInterfaces,
  uptime,
  pid: () => process.pid,
  readFile: async (path) => readFile(path, 'utf8'),
  readdir: async (path) => readdir(path),
  statfs,
  wait: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  root: parse(process.cwd()).root,
  now: Date.now
}

/** Read-only capability-detected host metrics. Missing sensors are explicit, never fabricated. */
export class SystemMetricsService {
  constructor(private readonly dependencies: SystemMetricsDependencies = DEFAULT_DEPENDENCIES) {}

  async collect(storagePath = this.dependencies.root): Promise<SystemMetricsSnapshot> {
    const hostPlatform = this.dependencies.platform()
    const [cpu, storage, battery, thermal, fans, gpu, processes] = await Promise.all([
      this.collectCpu(),
      this.collectStorage(storagePath),
      this.collectLinuxBatteries(),
      this.collectLinuxThermal(),
      this.collectLinuxFans(),
      this.collectLinuxGpu(),
      this.collectLinuxProcesses()
    ])
    return {
      collectedAt: this.dependencies.now(),
      hostPlatform,
      core: { pid: this.dependencies.pid(), uptimeSeconds: this.dependencies.uptime() },
      cpu,
      memory: this.collectMemory(),
      swap: await this.collectLinuxSwap(),
      storage,
      battery,
      thermal,
      fans,
      gpu,
      network: this.collectNetwork(),
      processes
    }
  }

  private async collectCpu(): Promise<MetricValue<CpuMetrics>> {
    const before = this.dependencies.cpus()
    if (before.length === 0) return unavailable('node:os', 'CPU information is unavailable.')
    await this.dependencies.wait(100)
    const after = this.dependencies.cpus()
    const usagePercent = computeCpuUsagePercent(before, after)
    if (usagePercent === null) return unavailable('node:os', 'CPU sampling failed.')
    return available('node:os', {
      usagePercent,
      logicalCores: after.length,
      model: after[0]?.model ?? before[0].model
    })
  }

  private collectMemory(): MetricValue<MemoryMetrics> {
    return available(
      'node:os',
      memoryMetrics(this.dependencies.totalmem(), this.dependencies.freemem())
    )
  }

  private async collectStorage(path: string): Promise<MetricValue<StorageMetrics>> {
    try {
      const result = await this.dependencies.statfs(path)
      const totalBytes = result.blocks * result.bsize
      const availableBytes = result.bavail * result.bsize
      const usedBytes = Math.max(0, totalBytes - result.bfree * result.bsize)
      return available('fs.statfs', {
        path,
        totalBytes,
        usedBytes,
        availableBytes,
        usagePercent: percent(usedBytes, totalBytes)
      })
    } catch {
      return unavailable('fs.statfs', 'Storage metrics are unavailable for this path.')
    }
  }

  private collectNetwork(): MetricValue<NetworkInterfaceSummary[]> {
    const interfaces = this.dependencies.networkInterfaces()
    const summaries = Object.entries(interfaces).flatMap(([name, addresses]) => {
      if (!addresses || addresses.length === 0) return []
      return [
        {
          name,
          addressCount: addresses.length,
          internal: addresses.every((address) => address.internal),
          families: [...new Set(addresses.map((address) => String(address.family)))]
        }
      ]
    })
    return summaries.length > 0
      ? available('node:os', summaries)
      : unavailable('node:os', 'No network interfaces were exposed.')
  }

  private async collectLinuxSwap(): Promise<MetricValue<MemoryMetrics>> {
    if (!this.isLinux()) return unavailable('/proc/meminfo', 'Swap metrics require Linux procfs.')
    try {
      const values = parseLinuxMeminfo(await this.readRootFile('proc/meminfo'))
      const totalBytes = (values.SwapTotal ?? 0) * 1024
      const availableBytes = (values.SwapFree ?? 0) * 1024
      return available('/proc/meminfo', memoryMetrics(totalBytes, availableBytes))
    } catch {
      return unavailable('/proc/meminfo', 'Swap metrics were not exposed by procfs.')
    }
  }

  private async collectLinuxBatteries(): Promise<MetricValue<BatteryMetrics[]>> {
    if (!this.isLinux()) return unavailable('sysfs', 'Battery metrics require Linux sysfs.')
    try {
      const root = this.rootPath('sys/class/power_supply')
      const names = (await this.dependencies.readdir(root)).filter((name) => /^BAT/i.test(name))
      const batteries = await Promise.all(
        names.map(async (name) => {
          const capacity = await this.readOptionalNumber(join(root, name, 'capacity'))
          return {
            name,
            capacityPercent: capacity === null ? null : clampPercent(capacity),
            status: await this.readOptionalText(join(root, name, 'status')),
            energyNowMicrowattHours: await this.readOptionalNumber(join(root, name, 'energy_now')),
            energyFullMicrowattHours: await this.readOptionalNumber(
              join(root, name, 'energy_full')
            ),
            powerNowMicrowatts: await this.readOptionalNumber(join(root, name, 'power_now'))
          }
        })
      )
      return batteries.length > 0
        ? available('sysfs', batteries)
        : unavailable('sysfs', 'No battery device was exposed.')
    } catch {
      return unavailable('sysfs', 'Battery metrics were not exposed.')
    }
  }

  private async collectLinuxThermal(): Promise<MetricValue<TemperatureSensor[]>> {
    if (!this.isLinux()) return unavailable('sysfs', 'Thermal metrics require Linux sysfs.')
    try {
      const root = this.rootPath('sys/class/thermal')
      const zones = (await this.dependencies.readdir(root)).filter((name) =>
        name.startsWith('thermal_zone')
      )
      const sensors = (
        await Promise.all(
          zones.map(async (zone) => {
            const raw = await this.readOptionalNumber(join(root, zone, 'temp'))
            if (raw === null) return null
            const celsius = normalizeTemperature(raw)
            if (celsius < -100 || celsius > 250) return null
            return {
              name: (await this.readOptionalText(join(root, zone, 'type'))) ?? zone,
              celsius
            }
          })
        )
      ).filter((sensor): sensor is TemperatureSensor => sensor !== null)
      return sensors.length > 0
        ? available('sysfs', sensors)
        : unavailable('sysfs', 'No thermal sensors were exposed.')
    } catch {
      return unavailable('sysfs', 'Thermal metrics were not exposed.')
    }
  }

  private async collectLinuxFans(): Promise<MetricValue<FanSensor[]>> {
    if (!this.isLinux()) return unavailable('sysfs', 'Fan metrics require Linux sysfs.')
    try {
      const root = this.rootPath('sys/class/hwmon')
      const devices = await this.dependencies.readdir(root)
      const sensors: FanSensor[] = []
      for (const device of devices) {
        const deviceRoot = join(root, device)
        const files = await this.dependencies.readdir(deviceRoot).catch(() => [])
        const deviceName = (await this.readOptionalText(join(deviceRoot, 'name'))) ?? device
        for (const file of files.filter((name) => /^fan\d+_input$/.test(name))) {
          const rpm = await this.readOptionalNumber(join(deviceRoot, file))
          if (rpm !== null && rpm >= 0) sensors.push({ name: `${deviceName}:${file}`, rpm })
        }
      }
      return sensors.length > 0
        ? available('sysfs', sensors)
        : unavailable('sysfs', 'No fan sensors were exposed.')
    } catch {
      return unavailable('sysfs', 'Fan metrics were not exposed.')
    }
  }

  private async collectLinuxGpu(): Promise<MetricValue<GpuMetrics[]>> {
    if (!this.isLinux()) return unavailable('sysfs', 'GPU metrics require Linux sysfs.')
    try {
      const root = this.rootPath('sys/class/drm')
      const cards = (await this.dependencies.readdir(root)).filter((name) => /^card\d+$/.test(name))
      const metrics = (
        await Promise.all(
          cards.map(async (device) => {
            const usagePercent = await this.readOptionalNumber(
              join(root, device, 'device', 'gpu_busy_percent')
            )
            return usagePercent === null
              ? null
              : { device, usagePercent: clampPercent(usagePercent) }
          })
        )
      ).filter((metric): metric is GpuMetrics => metric !== null)
      return metrics.length > 0
        ? available('sysfs', metrics)
        : unavailable('sysfs', 'No supported GPU usage sensor was exposed.')
    } catch {
      return unavailable('sysfs', 'GPU metrics were not exposed.')
    }
  }

  private async collectLinuxProcesses(): Promise<MetricValue<ProcessSummary[]>> {
    if (!this.isLinux()) return unavailable('/proc', 'Process listing requires Linux procfs.')
    try {
      const procRoot = this.rootPath('proc')
      const pids = (await this.dependencies.readdir(procRoot))
        .filter((entry) => /^\d+$/.test(entry))
        .sort((a, b) => Number(a) - Number(b))
        .slice(0, 256)
      const processes = (
        await Promise.all(
          pids.map(async (entry) => {
            const pid = Number(entry)
            const name = await this.readOptionalText(join(procRoot, entry, 'comm'))
            if (!name) return null
            const status = await this.readOptionalText(join(procRoot, entry, 'status'))
            const residentKilobytes = status?.match(/^VmRSS:\s+(\d+)/m)?.[1]
            return {
              pid,
              name,
              residentBytes: residentKilobytes ? Number(residentKilobytes) * 1024 : null
            }
          })
        )
      ).filter((process): process is ProcessSummary => process !== null)
      return available(
        '/proc',
        processes.sort((a, b) => a.pid - b.pid)
      )
    } catch {
      return unavailable('/proc', 'Process metrics were not exposed by procfs.')
    }
  }

  private isLinux(): boolean {
    return this.dependencies.platform() === 'linux'
  }

  private rootPath(path: string): string {
    return join(this.dependencies.root, path)
  }

  private readRootFile(path: string): Promise<string> {
    return this.dependencies.readFile(this.rootPath(path))
  }

  private async readOptionalText(path: string): Promise<string | null> {
    try {
      return (await this.dependencies.readFile(path)).trim()
    } catch {
      return null
    }
  }

  private async readOptionalNumber(path: string): Promise<number | null> {
    const text = await this.readOptionalText(path)
    if (text === null) return null
    const value = Number(text)
    return Number.isFinite(value) ? value : null
  }
}

export function computeCpuUsagePercent(before: CpuInfo[], after: CpuInfo[]): number | null {
  if (before.length === 0 || before.length !== after.length) return null
  let totalDelta = 0
  let idleDelta = 0
  for (let index = 0; index < before.length; index += 1) {
    const beforeTimes = before[index].times
    const afterTimes = after[index].times
    const beforeTotal = Object.values(beforeTimes).reduce((sum, value) => sum + value, 0)
    const afterTotal = Object.values(afterTimes).reduce((sum, value) => sum + value, 0)
    totalDelta += Math.max(0, afterTotal - beforeTotal)
    idleDelta += Math.max(0, afterTimes.idle - beforeTimes.idle)
  }
  if (totalDelta === 0) return null
  return clampPercent(((totalDelta - idleDelta) / totalDelta) * 100)
}

export function parseLinuxMeminfo(content: string): Record<string, number> {
  const values: Record<string, number> = {}
  for (const line of content.split('\n')) {
    const match = line.match(/^([^:]+):\s+(\d+)/)
    if (match) values[match[1]] = Number(match[2])
  }
  return values
}

function memoryMetrics(totalBytes: number, availableBytes: number): MemoryMetrics {
  const usedBytes = Math.max(0, totalBytes - availableBytes)
  return { totalBytes, usedBytes, availableBytes, usagePercent: percent(usedBytes, totalBytes) }
}

function normalizeTemperature(value: number): number {
  return Math.abs(value) >= 1000 ? value / 1000 : value
}

function percent(value: number, total: number): number {
  return total <= 0 ? 0 : clampPercent((value / total) * 100)
}

function clampPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 10) / 10
}

function available<T>(source: string, value: T): MetricValue<T> {
  return { available: true, value, source }
}

function unavailable<T>(source: string, reason: string): MetricValue<T> {
  return { available: false, source, reason }
}
