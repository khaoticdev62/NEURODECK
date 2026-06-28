import { createHash, randomUUID } from 'node:crypto'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  DiagnosticsInfo,
  NetworkDiagnostics,
  SupportBundleRecord,
  SystemMetricsSnapshot
} from '@shared/contracts'

export interface SupportBundleCollectors {
  diagnostics: () => Promise<DiagnosticsInfo>
  systemMetrics: () => Promise<SystemMetricsSnapshot>
  networkDiagnostics: () => Promise<NetworkDiagnostics>
}

export interface SupportBundleServiceOptions {
  outputDirectory: string
  collectors: SupportBundleCollectors
  now?: () => Date
  generateId?: () => string
}

interface SupportBundlePayload {
  schemaVersion: '1.0.0'
  id: string
  createdAt: string
  includes: string[]
  redactions: string[]
  diagnostics: DiagnosticsInfo
  systemMetrics: SystemMetricsSnapshot | null
  networkDiagnostics: NetworkDiagnostics | null
  collectorErrors: { collector: string; message: string }[]
}

const REDACTIONS = [
  'No vault secrets or revealed credentials',
  'No provider API keys',
  'No clipboard entries',
  'No memory item content',
  'No workspace file contents',
  'No environment variables'
]

export class SupportBundleService {
  private readonly now: () => Date
  private readonly generateId: () => string

  constructor(private readonly options: SupportBundleServiceOptions) {
    this.now = options.now ?? (() => new Date())
    this.generateId = options.generateId ?? randomUUID
  }

  async create(): Promise<SupportBundleRecord> {
    const id = this.generateId()
    const createdAt = this.now().toISOString()
    const collectorErrors: SupportBundlePayload['collectorErrors'] = []
    const diagnostics = await this.options.collectors.diagnostics()
    const systemMetrics = await collectOptional(
      'systemMetrics',
      this.options.collectors.systemMetrics,
      collectorErrors
    )
    const networkDiagnostics = await collectOptional(
      'networkDiagnostics',
      this.options.collectors.networkDiagnostics,
      collectorErrors
    )
    const payload: SupportBundlePayload = {
      schemaVersion: '1.0.0',
      id,
      createdAt,
      includes: ['diagnostics', 'systemMetrics', 'networkDiagnostics', 'collectorErrors'],
      redactions: REDACTIONS,
      diagnostics,
      systemMetrics,
      networkDiagnostics,
      collectorErrors
    }
    const serialized = `${JSON.stringify(payload, null, 2)}\n`
    const sha256 = createHash('sha256').update(serialized).digest('hex')
    await mkdir(this.options.outputDirectory, { recursive: true })
    const path = join(
      this.options.outputDirectory,
      `ndx-support-bundle-${safeTimestamp(createdAt)}.json`
    )
    await writeFile(path, serialized, 'utf8')
    const stats = await stat(path)
    return {
      id,
      createdAt,
      path,
      byteSize: stats.size,
      sha256,
      includes: payload.includes,
      redactions: payload.redactions
    }
  }
}

async function collectOptional<T>(
  collector: string,
  run: () => Promise<T>,
  errors: SupportBundlePayload['collectorErrors']
): Promise<T | null> {
  try {
    return await run()
  } catch (error) {
    errors.push({
      collector,
      message: error instanceof Error ? error.message : 'Unknown collector failure.'
    })
    return null
  }
}

function safeTimestamp(value: string): string {
  return value.replace(/[:.]/g, '-')
}
