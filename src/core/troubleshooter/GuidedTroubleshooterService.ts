import type {
  TroubleshooterCheckStatus,
  TroubleshooterIssueId,
  TroubleshooterResult
} from '@shared/contracts'
import type { CapabilityRegistry } from '../capability/CapabilityRegistry'
import type { ExtensionStore } from '../extensions/ExtensionStore'
import type { ModelProviderService } from '../models/ModelProviderService'
import type { ModelProviderStore } from '../models/ModelProviderStore'
import type { NetworkService } from '../network/NetworkService'
import type { SystemMetricsService } from '../system/SystemMetricsService'
import type { UpdateService } from '../system/UpdateService'

interface Step {
  label: string
  status: TroubleshooterCheckStatus
  detail: string
}

/**
 * Real Epic X13 Guided Troubleshooter (supplemental spec §41.3): "The
 * troubleshooter must run real diagnostics and never pretend an issue
 * is fixed." Every check below calls an already-real service this
 * codebase has — never a fabricated pass/fail. Issues from the spec's
 * own list deliberately not implemented here, each for a named
 * reason: Focus stuck (no automated focus-graph health check exists),
 * Steam shortcut broken (Steam Shortcut Manager itself is deferred,
 * Epic X2), Terminal failure beyond capability status (actually
 * spawning a PTY as a side-effecting diagnostic is a different kind of
 * action than the read-only checks here), VPN failure (no VPN adapter
 * exists, Epic X10/LAN-9), Display unusable (no display-health
 * adapter exists, Epic X8), Database recovery (covered by the real
 * Backup verify flow already on `/backup`, not duplicated here).
 * "Controller not detected" is checked client-side via the real
 * browser Gamepad API and never reaches this service.
 */
export class GuidedTroubleshooterService {
  constructor(
    private readonly networkService: NetworkService,
    private readonly modelProviderStore: ModelProviderStore,
    private readonly modelProviderService: ModelProviderService,
    private readonly capabilityRegistry: CapabilityRegistry,
    private readonly systemMetricsService: SystemMetricsService,
    private readonly extensionStore: ExtensionStore,
    private readonly updateService: UpdateService
  ) {}

  async runCheck(issueId: TroubleshooterIssueId): Promise<TroubleshooterResult> {
    const steps = await this.collectSteps(issueId)
    const overallStatus = combineStatus(steps)
    return {
      issueId,
      ranAt: Date.now(),
      steps,
      overallStatus,
      remediation: remediationFor(issueId, steps)
    }
  }

  private async collectSteps(issueId: TroubleshooterIssueId): Promise<Step[]> {
    switch (issueId) {
      case 'no-network':
        return this.checkNetwork()
      case 'model-unavailable':
        return this.checkModelProviders()
      case 'no-microphone':
        return this.checkMicrophone()
      case 'storage-low':
        return this.checkStorage()
      case 'extension-crash':
        return this.checkExtensions()
      case 'update-failure':
        return this.checkUpdate()
      default:
        return []
    }
  }

  private async checkNetwork(): Promise<Step[]> {
    const diagnostics = await this.networkService.getDiagnostics()
    const steps: Step[] = []

    const interfaces = diagnostics.interfaces
    steps.push({
      label: 'Network interfaces',
      status: !interfaces.available
        ? 'unknown'
        : (interfaces.value?.length ?? 0) > 0
          ? 'pass'
          : 'fail',
      detail: !interfaces.available
        ? (interfaces.reason ?? 'Interface detection is unavailable.')
        : `${interfaces.value?.length ?? 0} real interface(s) detected.`
    })

    const connections = diagnostics.connections
    const connected = connections.value?.some((connection) => connection.state === 'connected')
    steps.push({
      label: 'Connection state',
      status: !connections.available ? 'unknown' : connected ? 'pass' : 'fail',
      detail: !connections.available
        ? (connections.reason ?? 'Connection state is unavailable.')
        : (connections.value ?? [])
            .map((connection) => `${connection.name}: ${connection.state}`)
            .join('; ') || 'No connections reported.'
    })

    const dns = diagnostics.dns
    steps.push({
      label: 'DNS servers',
      status: !dns.available ? 'unknown' : (dns.value?.length ?? 0) > 0 ? 'pass' : 'fail',
      detail: !dns.available
        ? (dns.reason ?? 'DNS configuration is unavailable.')
        : `${dns.value?.length ?? 0} DNS server(s) configured.`
    })

    return steps
  }

  private async checkModelProviders(): Promise<Step[]> {
    const providers = await this.modelProviderStore.list()
    if (providers.length === 0) {
      return [
        {
          label: 'Configured providers',
          status: 'warning',
          detail: 'No model providers are configured yet.'
        }
      ]
    }
    const steps: Step[] = []
    for (const provider of providers) {
      if (!provider.enabled) {
        steps.push({ label: provider.name, status: 'warning', detail: 'Provider is disabled.' })
        continue
      }
      const baseUrl = await this.modelProviderStore.getBaseUrl(provider.id)
      if (!baseUrl) {
        steps.push({ label: provider.name, status: 'fail', detail: 'No base URL configured.' })
        continue
      }
      try {
        const apiKey = await this.modelProviderStore.getApiKey(provider.id)
        const result = await this.modelProviderService.testConnection(baseUrl, apiKey)
        steps.push({
          label: provider.name,
          status: result.ok ? 'pass' : 'fail',
          detail: result.message
        })
      } catch (error) {
        steps.push({
          label: provider.name,
          status: 'fail',
          detail: error instanceof Error ? error.message : 'Connection test failed.'
        })
      }
    }
    return steps
  }

  private async checkMicrophone(): Promise<Step[]> {
    const capabilities = await this.capabilityRegistry.list()
    const microphone = capabilities.find((capability) => capability.id === 'microphone')
    if (!microphone) return [{ label: 'Microphone', status: 'unknown', detail: 'Not tracked.' }]
    return [
      {
        label: 'Microphone capability',
        status: microphone.status === 'available' ? 'pass' : 'fail',
        detail: microphone.reason
      }
    ]
  }

  private async checkStorage(): Promise<Step[]> {
    const snapshot = await this.systemMetricsService.collect()
    if (!snapshot.storage.available || !snapshot.storage.value) {
      return [
        {
          label: 'Storage',
          status: 'unknown',
          detail: snapshot.storage.reason ?? 'Storage metrics are unavailable.'
        }
      ]
    }
    const { usagePercent, availableBytes, path } = snapshot.storage.value
    return [
      {
        label: `Storage at ${path}`,
        status: usagePercent >= 95 ? 'fail' : usagePercent >= 85 ? 'warning' : 'pass',
        detail: `${usagePercent.toFixed(1)}% used, ${Math.round(availableBytes / (1024 * 1024 * 1024))} GB free.`
      }
    ]
  }

  private async checkExtensions(): Promise<Step[]> {
    const extensions = await this.extensionStore.list()
    const quarantined = extensions.filter((extension) => extension.state === 'quarantined')
    if (quarantined.length === 0) {
      return [
        {
          label: 'Quarantined extensions',
          status: 'pass',
          detail: 'No extensions are currently quarantined.'
        }
      ]
    }
    return quarantined.map((extension) => ({
      label: extension.manifest.name,
      status: 'fail',
      detail: extension.quarantineReason ?? 'Quarantined after repeated faults.'
    }))
  }

  private async checkUpdate(): Promise<Step[]> {
    const result = await this.updateService.getStatus()
    if (!result.ok) {
      return [{ label: 'Update check', status: 'fail', detail: result.error.userMessage }]
    }
    const status = result.data
    if (!status.checkEnabled) {
      return [
        {
          label: 'Update check',
          status: 'warning',
          detail: status.reason ?? 'Update checking is not enabled.'
        }
      ]
    }
    return [
      {
        label: 'Update feed',
        status: 'pass',
        detail: `Running ${status.currentVersion} on the ${status.channel} channel. ${
          status.updateAvailable ? `${status.latestVersion} is available.` : 'Up to date.'
        }`
      }
    ]
  }
}

function combineStatus(steps: Step[]): TroubleshooterCheckStatus {
  if (steps.length === 0) return 'unknown'
  if (steps.some((step) => step.status === 'fail')) return 'fail'
  if (steps.some((step) => step.status === 'warning')) return 'warning'
  if (steps.every((step) => step.status === 'unknown')) return 'unknown'
  return 'pass'
}

function remediationFor(issueId: TroubleshooterIssueId, steps: Step[]): string[] {
  const failed = steps.filter((step) => step.status === 'fail')
  if (failed.length === 0) return []
  switch (issueId) {
    case 'no-network':
      return [
        'Check that the device is connected to a real network (Wi-Fi or Ethernet).',
        'Confirm router/DNS is reachable from another device on the same network.'
      ]
    case 'model-unavailable':
      return [
        'Verify the provider base URL and API key in Model Control Center.',
        'Confirm the provider service is actually running and reachable from this device.'
      ]
    case 'no-microphone':
      return ['Grant microphone permission in Privacy and Permissions, then retry.']
    case 'storage-low':
      return [
        'Free up space: clear old backups, large workspace files, or downloads.',
        'Check the Privacy and Data Map for clearable local data.'
      ]
    case 'extension-crash':
      return [
        'Open the affected extension’s detail screen to review its fault history.',
        'Update or remove the extension if faults continue after clearing quarantine.'
      ]
    case 'update-failure':
      return ['Confirm network connectivity, then retry the update check.']
    default:
      return []
  }
}
