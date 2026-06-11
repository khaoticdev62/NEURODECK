/**
 * Backend contract tests — verify shape invariants for all backend types.
 */
import { describe, it, expect } from 'vitest';
import {
  isBackendProbeResult,
  isDataProvenance,
  isNeurodeckBackendError,
  assertNoMockInProduction,
} from '../../src/shared/schemas/backendHealth.schemas';

describe('BackendProbeResult schema', () => {
  const validResult = {
    id: 'test-probe', ok: true, status: 'production_ready',
    requestId: 'req-123', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    durationMs: 42, realTransportUsed: true, realDataObserved: true, mockDataDetected: false,
    source: 'test', target: 'sidecar', bytesSent: 10, bytesReceived: 100, evidence: [],
  };

  it('validates a correct result shape', () => expect(isBackendProbeResult(validResult)).toBe(true));
  it('rejects missing id', () => expect(isBackendProbeResult({ ...validResult, id: undefined })).toBe(false));
  it('rejects non-boolean ok', () => expect(isBackendProbeResult({ ...validResult, ok: 'yes' })).toBe(false));
  it('rejects null', () => expect(isBackendProbeResult(null)).toBe(false));
  it('rejects missing evidence', () => expect(isBackendProbeResult({ ...validResult, evidence: undefined })).toBe(false));
});

describe('DataProvenance schema', () => {
  const validProv = {
    sourceType: 'filesystem', sourceId: 'sessions-dir', realData: true, mockData: false,
    generatedAt: new Date().toISOString(), requestId: 'req-456', durationMs: 15,
  };

  it('validates correct provenance', () => expect(isDataProvenance(validProv)).toBe(true));
  it('rejects missing sourceType', () => expect(isDataProvenance({ ...validProv, sourceType: undefined })).toBe(false));
  it('rejects missing realData', () => expect(isDataProvenance({ ...validProv, realData: undefined })).toBe(false));
});

describe('assertNoMockInProduction', () => {
  it('throws when mockData=true in production path', () => {
    const prov = { sourceType: 'filesystem' as const, sourceId: 'test', realData: false, mockData: true, generatedAt: '', requestId: '', durationMs: 0 };
    expect(() => assertNoMockInProduction(prov, 'test-context')).toThrow('Mock data reached production path');
  });
  it('does not throw when mockData=false', () => {
    const prov = { sourceType: 'filesystem' as const, sourceId: 'test', realData: true, mockData: false, generatedAt: '', requestId: '', durationMs: 0 };
    expect(() => assertNoMockInProduction(prov, 'test-context')).not.toThrow();
  });
});

describe('NeurodeckBackendError schema', () => {
  const validError = {
    code: 'ERR_API', message: 'Bridge offline', category: 'api', recoverable: true,
    requestId: 'req-789', source: 'test-probe',
  };

  it('validates correct error shape', () => expect(isNeurodeckBackendError(validError)).toBe(true));
  it('rejects missing code', () => expect(isNeurodeckBackendError({ ...validError, code: undefined })).toBe(false));
  it('rejects missing requestId', () => expect(isNeurodeckBackendError({ ...validError, requestId: undefined })).toBe(false));
});
