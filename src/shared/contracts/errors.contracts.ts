/**
 * Normalized backend error contracts for NEURODECK.
 * Every backend error must conform to this shape before reaching the renderer.
 */

export type ErrorCategory =
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

export interface NeurodeckBackendError {
  code: string;
  message: string;
  category: ErrorCategory;
  recoverable: boolean;
  userAction?: string;
  technicalDetails?: string;
  requestId: string;
  source: string;
  target?: string;
}

export function makeError(
  code: string,
  message: string,
  category: ErrorCategory,
  options: {
    recoverable?: boolean;
    userAction?: string;
    technicalDetails?: string;
    requestId?: string;
    source?: string;
    target?: string;
  } = {}
): NeurodeckBackendError {
  return {
    code,
    message,
    category,
    recoverable: options.recoverable ?? true,
    userAction: options.userAction,
    technicalDetails: options.technicalDetails,
    requestId: options.requestId ?? `err-${Date.now()}`,
    source: options.source ?? 'unknown',
    target: options.target,
  };
}

export const ERROR_CODES = {
  SIDECAR_OFFLINE: 'SIDECAR_OFFLINE',
  SIDECAR_ERROR: 'SIDECAR_ERROR',
  IPC_VALIDATION_FAILED: 'IPC_VALIDATION_FAILED',
  IPC_PAYLOAD_TOO_LARGE: 'IPC_PAYLOAD_TOO_LARGE',
  IPC_SENDER_BLOCKED: 'IPC_SENDER_BLOCKED',
  PROVIDER_NOT_CONFIGURED: 'PROVIDER_NOT_CONFIGURED',
  PROVIDER_OFFLINE: 'PROVIDER_OFFLINE',
  PROVIDER_AUTH_FAILED: 'PROVIDER_AUTH_FAILED',
  STORAGE_READ_FAILED: 'STORAGE_READ_FAILED',
  STORAGE_WRITE_FAILED: 'STORAGE_WRITE_FAILED',
  STORAGE_NOT_FOUND: 'STORAGE_NOT_FOUND',
  LSP_SPAWN_FAILED: 'LSP_SPAWN_FAILED',
  LSP_TIMEOUT: 'LSP_TIMEOUT',
  LSP_NOT_STARTED: 'LSP_NOT_STARTED',
  PLUGIN_MANIFEST_INVALID: 'PLUGIN_MANIFEST_INVALID',
  PLUGIN_LOAD_FAILED: 'PLUGIN_LOAD_FAILED',
  SETTING_NOT_CONFIGURABLE: 'SETTING_NOT_CONFIGURABLE',
  MOCK_DATA_IN_PRODUCTION: 'MOCK_DATA_IN_PRODUCTION',
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
