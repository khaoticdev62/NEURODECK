import { randomUUID } from 'node:crypto'
import type { CrashReport, CreateRendererCrashReportRequest } from '../../shared/contracts'
import { JsonStore } from '../persistence/JsonStore'

interface CrashReportIndex {
  reports: CrashReport[]
}

interface RendererProcessGoneDetails {
  reason: string
  exitCode: number
}

const MAX_REPORTS = 100
const MAX_MESSAGE_LENGTH = 500
const MAX_DETAIL_LENGTH = 8_000

export class CrashReportStore {
  private readonly store: JsonStore<CrashReportIndex>

  constructor(
    filePath: string,
    private readonly now: () => number = () => Date.now(),
    private readonly generateId: () => string = () => randomUUID()
  ) {
    this.store = new JsonStore(filePath, { reports: [] })
  }

  async list(): Promise<CrashReport[]> {
    const index = await this.store.read()
    return [...index.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async recordRendererError(request: CreateRendererCrashReportRequest): Promise<CrashReport> {
    return this.append({
      kind: 'renderer-error-boundary',
      message: request.message,
      stack: request.stack,
      componentStack: request.componentStack,
      route: request.route,
      code: request.code,
      correlationId: request.correlationId
    })
  }

  async recordRendererProcessGone(details: RendererProcessGoneDetails): Promise<CrashReport> {
    return this.append({
      kind: 'renderer-process-gone',
      message: `Renderer process ended: ${details.reason}`,
      reason: details.reason,
      exitCode: Number.isFinite(details.exitCode) ? details.exitCode : undefined
    })
  }

  async recordMainUncaughtException(error: Error): Promise<CrashReport> {
    return this.append({
      kind: 'main-uncaught-exception',
      message: error.message || error.name || 'Main process uncaught exception',
      stack: error.stack,
      code: error.name
    })
  }

  private async append(
    report: Omit<CrashReport, 'id' | 'createdAt' | 'storedLocallyOnly'>
  ): Promise<CrashReport> {
    const index = await this.store.read()
    const stored: CrashReport = {
      id: this.generateId(),
      createdAt: new Date(this.now()).toISOString(),
      kind: report.kind,
      message: truncate(report.message, MAX_MESSAGE_LENGTH),
      stack: truncateOptional(report.stack, MAX_DETAIL_LENGTH),
      componentStack: truncateOptional(report.componentStack, MAX_DETAIL_LENGTH),
      route: truncateOptional(report.route, MAX_MESSAGE_LENGTH),
      code: truncateOptional(report.code, MAX_MESSAGE_LENGTH),
      reason: truncateOptional(report.reason, MAX_MESSAGE_LENGTH),
      exitCode: report.exitCode,
      processType: truncateOptional(report.processType, MAX_MESSAGE_LENGTH),
      correlationId: truncateOptional(report.correlationId, MAX_MESSAGE_LENGTH),
      storedLocallyOnly: true
    }
    const reports = [stored, ...index.reports].slice(0, MAX_REPORTS)
    await this.store.write({ reports })
    return stored
  }
}

function truncateOptional(value: string | undefined, maxLength: number): string | undefined {
  if (value === undefined) return undefined
  return truncate(value, maxLength)
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 15)}...[truncated]`
}
