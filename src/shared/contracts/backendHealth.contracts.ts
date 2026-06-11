/**
 * Backend health contracts — shared between main process and renderer diagnostics.
 * All types are plain data (no Node.js / Electron imports allowed here).
 */

export type BackendServiceStatus =
  | 'production_ready'
  | 'not_configured'
  | 'offline'
  | 'blocked'
  | 'mocked'
  | 'partially_mocked'
  | 'legacy_pending_migration'
  | 'deprecated'
  | 'unknown';

export type BackendServiceCategory =
  | 'ipc'
  | 'service'
  | 'provider'
  | 'storage'
  | 'model_runtime'
  | 'lsp'
  | 'plugin'
  | 'telemetry'
  | 'settings'
  | 'export'
  | 'legacy';

export type EvidenceType =
  | 'ipc_roundtrip'
  | 'api_roundtrip'
  | 'storage_write_read_delete'
  | 'lsp_initialize'
  | 'model_runtime_ping'
  | 'plugin_manifest_validation'
  | 'system_telemetry_read'
  | 'mock_scan'
  | 'fallow_audit'
  | 'performance_measurement';

export type DataSourceType =
  | 'local_storage'
  | 'sqlite'
  | 'filesystem'
  | 'local_model_runtime'
  | 'remote_api'
  | 'lsp_server'
  | 'plugin_runtime'
  | 'system_telemetry'
  | 'computed'
  | 'not_configured'
  | 'unknown';

export interface DataProvenance {
  sourceType: DataSourceType;
  sourceId: string;
  realData: boolean;
  mockData: boolean;
  generatedAt: string;
  requestId: string;
  durationMs: number;
  bytesRead?: number;
  bytesWritten?: number;
  recordsRead?: number;
  recordsWritten?: number;
  checksum?: string;
}

export interface BackendEvidence {
  timestamp: string;
  probeId: string;
  requestId: string;
  evidenceType: EvidenceType;
  passed: boolean;
  summary: string;
  durationMs: number;
  bytesSent: number;
  bytesReceived: number;
  artifactPath?: string;
}

export interface NeurodeckBackendError {
  code: string;
  message: string;
  category:
    | 'validation'
    | 'ipc'
    | 'api'
    | 'auth'
    | 'storage'
    | 'filesystem'
    | 'lsp'
    | 'plugin'
    | 'model_runtime'
    | 'telemetry'
    | 'configuration'
    | 'timeout'
    | 'security'
    | 'mock_data_violation'
    | 'unknown';
  recoverable: boolean;
  userAction?: string;
  technicalDetails?: string;
  requestId: string;
  source: string;
  target?: string;
}

export interface BackendProbeResult {
  id: string;
  ok: boolean;
  status: BackendServiceStatus;
  requestId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  realTransportUsed: boolean;
  realDataObserved: boolean;
  mockDataDetected: boolean;
  source: string;
  target: string;
  bytesSent: number;
  bytesReceived: number;
  recordsRead?: number;
  recordsWritten?: number;
  checksum?: string;
  error?: NeurodeckBackendError;
  evidence: BackendEvidence[];
}

export interface BackendServiceInventoryEntry {
  id: string;
  label: string;
  category: BackendServiceCategory;
  sourceFile: string;
  callerLayer: string;
  ipcChannels: string[];
  preloadMethods: string[];
  provider: string;
  storageUsed: string;
  runtimeDependency: string;
  envVarsRequired: string[];
  secretsRequired: string[];
  dataSourceType: DataSourceType;
  mockRiskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  status: BackendServiceStatus;
  testsAvailable: boolean;
  healthProbeAvailable: boolean;
  optimizationRisk: 'none' | 'low' | 'medium' | 'high';
  knownBlockers: string[];
  notes: string;
}

export interface BackendReadinessReport {
  generatedAt: string;
  version: string;
  overallScore: number;
  totalServices: number;
  productionReadyCount: number;
  mockedCount: number;
  partiallyMockedCount: number;
  notConfiguredCount: number;
  blockedCount: number;
  deprecatedCount: number;
  services: BackendServiceInventoryEntry[];
  probeResults: BackendProbeResult[];
  mockViolations: MockViolationRecord[];
  securityFlags: SecurityFlag[];
  performanceBaseline: PerformanceBaseline;
  productionGatePassed: boolean;
  productionGateBlockers: string[];
}

export interface MockViolationRecord {
  file: string;
  line: number;
  pattern: string;
  context: string;
  classification: 'test_only_allowed' | 'storybook_only_allowed' | 'development_only_allowed' | 'production_violation' | 'unclear_needs_review' | 'safe_static_config';
  description: string;
}

export interface SecurityFlag {
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  pattern: string;
  description: string;
  remediation: string;
}

export interface PerformanceBaseline {
  measuredAt: string;
  backendInitMs: number;
  ipcRoundtripMedianMs: number;
  storageReadWriteMs: number;
  settingsLoadMs: number;
  sessionListMs: number;
  diagnosticsMatrixMs: number;
  providerHealthProbeMs: number;
  lspInitializeMs: number;
  pluginManifestScanMs: number;
  mainProcessIdleMemoryMb: number;
}
