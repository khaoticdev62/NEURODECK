/**
 * Runtime validation schemas for backend health contracts.
 * Validates shape without external dependencies.
 */

import type {
  BackendProbeResult,
  BackendEvidence,
  DataProvenance,
  NeurodeckBackendError,
  MockViolationRecord,
} from '../contracts/backendHealth.contracts';

export function isBackendProbeResult(v: unknown): v is BackendProbeResult {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.ok === 'boolean' &&
    typeof r.status === 'string' &&
    typeof r.requestId === 'string' &&
    typeof r.startedAt === 'string' &&
    typeof r.completedAt === 'string' &&
    typeof r.durationMs === 'number' &&
    typeof r.realTransportUsed === 'boolean' &&
    typeof r.realDataObserved === 'boolean' &&
    typeof r.mockDataDetected === 'boolean' &&
    typeof r.source === 'string' &&
    typeof r.target === 'string' &&
    typeof r.bytesSent === 'number' &&
    typeof r.bytesReceived === 'number' &&
    Array.isArray(r.evidence)
  );
}

export function isDataProvenance(v: unknown): v is DataProvenance {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.sourceType === 'string' &&
    typeof r.sourceId === 'string' &&
    typeof r.realData === 'boolean' &&
    typeof r.mockData === 'boolean' &&
    typeof r.generatedAt === 'string' &&
    typeof r.requestId === 'string' &&
    typeof r.durationMs === 'number'
  );
}

export function assertRealData(provenance: DataProvenance, context: string): void {
  if (provenance.mockData && !provenance.realData) return;
  if (provenance.realData && provenance.mockData) {
    throw new Error(`[${context}] DataProvenance has both realData=true and mockData=true — contradiction`);
  }
}

export function assertNoMockInProduction(provenance: DataProvenance, context: string): void {
  if (provenance.mockData === true) {
    throw new Error(`[${context}] Mock data reached production path — mockData=true is forbidden in production handlers`);
  }
}

export function isMockViolationRecord(v: unknown): v is MockViolationRecord {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.file === 'string' &&
    typeof r.line === 'number' &&
    typeof r.pattern === 'string' &&
    typeof r.classification === 'string'
  );
}

export function isNeurodeckBackendError(v: unknown): v is NeurodeckBackendError {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.code === 'string' &&
    typeof r.message === 'string' &&
    typeof r.category === 'string' &&
    typeof r.recoverable === 'boolean' &&
    typeof r.requestId === 'string' &&
    typeof r.source === 'string'
  );
}

export function validateProbeResultShape(result: unknown, probeId: string): BackendProbeResult {
  if (!isBackendProbeResult(result)) {
    throw new Error(`Probe "${probeId}" returned invalid shape: ${JSON.stringify(result)}`);
  }
  return result;
}

// Re-export from contracts for consumers of this module
export type { BackendProbeResult, DataProvenance, MockViolationRecord, NeurodeckBackendError } from '../contracts/backendHealth.contracts';
