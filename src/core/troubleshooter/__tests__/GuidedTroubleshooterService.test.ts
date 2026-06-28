import { describe, expect, it, vi } from 'vitest'
import type { CapabilityRegistry } from '../../capability/CapabilityRegistry'
import type { ExtensionStore } from '../../extensions/ExtensionStore'
import type { ModelProviderService } from '../../models/ModelProviderService'
import type { ModelProviderStore } from '../../models/ModelProviderStore'
import type { NetworkService } from '../../network/NetworkService'
import type { SystemMetricsService } from '../../system/SystemMetricsService'
import type { UpdateService } from '../../system/UpdateService'
import { GuidedTroubleshooterService } from '../GuidedTroubleshooterService'

function buildService(overrides: {
  networkService?: Partial<NetworkService>
  modelProviderStore?: Partial<ModelProviderStore>
  modelProviderService?: Partial<ModelProviderService>
  capabilityRegistry?: Partial<CapabilityRegistry>
  systemMetricsService?: Partial<SystemMetricsService>
  extensionStore?: Partial<ExtensionStore>
  updateService?: Partial<UpdateService>
}): GuidedTroubleshooterService {
  return new GuidedTroubleshooterService(
    (overrides.networkService ?? {}) as NetworkService,
    (overrides.modelProviderStore ?? {}) as ModelProviderStore,
    (overrides.modelProviderService ?? {}) as ModelProviderService,
    (overrides.capabilityRegistry ?? {}) as CapabilityRegistry,
    (overrides.systemMetricsService ?? {}) as SystemMetricsService,
    (overrides.extensionStore ?? {}) as ExtensionStore,
    (overrides.updateService ?? {}) as UpdateService
  )
}

describe('GuidedTroubleshooterService', () => {
  it('reports a real fail for no-network when no interface or connection is available', async () => {
    const service = buildService({
      networkService: {
        getDiagnostics: vi.fn().mockResolvedValue({
          interfaces: { available: true, source: 'os', value: [] },
          connections: { available: true, source: 'os', value: [] },
          dns: { available: true, source: 'os', value: [] },
          proxy: { available: false, source: 'os', reason: 'n/a' },
          vpn: { available: false, source: 'os', reason: 'n/a' },
          firewall: { available: false, source: 'os', reason: 'n/a' }
        })
      }
    })

    const result = await service.runCheck('no-network')

    expect(result.overallStatus).toBe('fail')
    expect(result.steps.map((step) => step.label)).toEqual([
      'Network interfaces',
      'Connection state',
      'DNS servers'
    ])
    expect(result.remediation.length).toBeGreaterThan(0)
  })

  it('reports pass for no-network when a real connected interface exists', async () => {
    const service = buildService({
      networkService: {
        getDiagnostics: vi.fn().mockResolvedValue({
          interfaces: {
            available: true,
            source: 'os',
            value: [{ name: 'eth0', addressCount: 1, internal: false, families: ['IPv4'] }]
          },
          connections: {
            available: true,
            source: 'os',
            value: [{ name: 'eth0', type: 'ethernet', state: 'connected' }]
          },
          dns: { available: true, source: 'os', value: ['1.1.1.1'] },
          proxy: { available: false, source: 'os', reason: 'n/a' },
          vpn: { available: false, source: 'os', reason: 'n/a' },
          firewall: { available: false, source: 'os', reason: 'n/a' }
        })
      }
    })

    const result = await service.runCheck('no-network')

    expect(result.overallStatus).toBe('pass')
    expect(result.remediation).toEqual([])
  })

  it('reports a real per-provider connection test result for model-unavailable', async () => {
    const service = buildService({
      modelProviderStore: {
        list: vi.fn().mockResolvedValue([
          {
            id: 'p1',
            name: 'Local Ollama',
            kind: 'openai-compatible',
            baseUrl: 'http://localhost:11434',
            hasApiKey: false,
            enabled: true,
            createdAt: 0
          }
        ]),
        getBaseUrl: vi.fn().mockResolvedValue('http://localhost:11434'),
        getApiKey: vi.fn().mockResolvedValue(null)
      },
      modelProviderService: {
        testConnection: vi
          .fn()
          .mockResolvedValue({ ok: false, message: 'Connection refused', models: [] })
      }
    })

    const result = await service.runCheck('model-unavailable')

    expect(result.overallStatus).toBe('fail')
    expect(result.steps).toEqual([
      { label: 'Local Ollama', status: 'fail', detail: 'Connection refused' }
    ])
  })

  it('reports a real warning for model-unavailable when no provider is configured', async () => {
    const service = buildService({
      modelProviderStore: { list: vi.fn().mockResolvedValue([]) }
    })

    const result = await service.runCheck('model-unavailable')

    expect(result.overallStatus).toBe('warning')
  })

  it('reports quarantined extensions as a real fail for extension-crash', async () => {
    const service = buildService({
      extensionStore: {
        list: vi.fn().mockResolvedValue([
          {
            manifest: { id: 'ext-1', name: 'Broken Extension' },
            state: 'quarantined',
            quarantineReason: 'Crashed 3 times in 60 seconds.'
          }
        ])
      } as never
    })

    const result = await service.runCheck('extension-crash')

    expect(result.overallStatus).toBe('fail')
    expect(result.steps[0]).toEqual({
      label: 'Broken Extension',
      status: 'fail',
      detail: 'Crashed 3 times in 60 seconds.'
    })
  })

  it('reports pass for extension-crash when nothing is quarantined', async () => {
    const service = buildService({
      extensionStore: { list: vi.fn().mockResolvedValue([]) }
    })

    const result = await service.runCheck('extension-crash')

    expect(result.overallStatus).toBe('pass')
  })

  it('never fabricates a pass for storage-low when storage metrics are unavailable', async () => {
    const service = buildService({
      systemMetricsService: {
        collect: vi.fn().mockResolvedValue({
          storage: { available: false, source: 'os', reason: 'No filesystem stat support.' }
        })
      } as never
    })

    const result = await service.runCheck('storage-low')

    expect(result.overallStatus).toBe('unknown')
    expect(result.steps[0].detail).toBe('No filesystem stat support.')
  })

  it('surfaces a real update-check failure rather than assuming up to date', async () => {
    const service = buildService({
      updateService: {
        getStatus: vi
          .fn()
          .mockResolvedValue({ ok: false, error: { userMessage: 'Update feed unreachable.' } })
      } as never
    })

    const result = await service.runCheck('update-failure')

    expect(result.overallStatus).toBe('fail')
    expect(result.steps[0].detail).toBe('Update feed unreachable.')
  })
})
