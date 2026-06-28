import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { SupportBundleService } from '../SupportBundleService'
import type { DiagnosticsInfo, NetworkDiagnostics, SystemMetricsSnapshot } from '@shared/contracts'

let tempDir: string | null = null

afterEach(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true })
  tempDir = null
})

const diagnostics: DiagnosticsInfo = {
  appVersion: '0.1.0',
  electronVersion: '39.0.0',
  chromeVersion: '128.0.0',
  nodeVersion: '22.0.0',
  platform: 'linux',
  arch: 'x64',
  license: 'Not specified',
  modelProviderNames: ['Local Ollama']
}

const systemMetrics = {
  collectedAt: 1,
  hostPlatform: 'linux',
  core: { pid: 1, uptimeSeconds: 10 },
  cpu: { available: false, source: 'test', reason: 'n/a' },
  memory: { available: false, source: 'test', reason: 'n/a' },
  swap: { available: false, source: 'test', reason: 'n/a' },
  storage: { available: false, source: 'test', reason: 'n/a' },
  battery: { available: false, source: 'test', reason: 'n/a' },
  thermal: { available: false, source: 'test', reason: 'n/a' },
  fans: { available: false, source: 'test', reason: 'n/a' },
  gpu: { available: false, source: 'test', reason: 'n/a' },
  network: { available: false, source: 'test', reason: 'n/a' },
  processes: { available: false, source: 'test', reason: 'n/a' }
} satisfies SystemMetricsSnapshot

const networkDiagnostics = {
  interfaces: { available: true, source: 'test', value: [] },
  connections: { available: false, source: 'test', reason: 'n/a' },
  dns: { available: true, source: 'test', value: [] },
  proxy: {
    available: true,
    source: 'test',
    value: { http: null, https: null, socks: null, noProxy: null }
  },
  vpn: { available: false, source: 'test', reason: 'n/a' },
  firewall: { available: false, source: 'test', reason: 'n/a' }
} satisfies NetworkDiagnostics

describe('SupportBundleService', () => {
  it('writes a redacted support bundle with real diagnostics collectors', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ndx-support-'))
    const service = new SupportBundleService({
      outputDirectory: tempDir,
      now: () => new Date('2026-06-28T12:00:00.000Z'),
      generateId: () => 'bundle-1',
      collectors: {
        diagnostics: async () => diagnostics,
        systemMetrics: async () => systemMetrics,
        networkDiagnostics: async () => networkDiagnostics
      }
    })

    const record = await service.create()
    const payload = JSON.parse(await readFile(record.path, 'utf8')) as {
      id: string
      diagnostics: DiagnosticsInfo
      redactions: string[]
      collectorErrors: unknown[]
    }

    expect(record.id).toBe('bundle-1')
    expect(record.byteSize).toBeGreaterThan(0)
    expect(record.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(payload.id).toBe('bundle-1')
    expect(payload.diagnostics.modelProviderNames).toEqual(['Local Ollama'])
    expect(payload.redactions).toContain('No provider API keys')
    expect(payload.redactions).toContain('No workspace file contents')
    expect(payload.collectorErrors).toEqual([])
  })

  it('records optional collector failures without failing the bundle', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ndx-support-'))
    const service = new SupportBundleService({
      outputDirectory: tempDir,
      collectors: {
        diagnostics: async () => diagnostics,
        systemMetrics: async () => {
          throw new Error('metrics unavailable')
        },
        networkDiagnostics: async () => networkDiagnostics
      }
    })

    const record = await service.create()
    const payload = JSON.parse(await readFile(record.path, 'utf8')) as {
      systemMetrics: null
      collectorErrors: { collector: string; message: string }[]
    }

    expect(payload.systemMetrics).toBeNull()
    expect(payload.collectorErrors).toEqual([
      { collector: 'systemMetrics', message: 'metrics unavailable' }
    ])
  })
})
