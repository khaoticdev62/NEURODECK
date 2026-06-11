/**
 * Normalizes all backend errors into the NeurodeckBackendError contract.
 * All backend handlers should route errors through this before returning to renderer.
 */

import type { NeurodeckBackendError, ErrorCategory } from '../../shared/contracts/errors.contracts';

const SECRET_PATTERNS = [
  /(?:api[_-]?key|secret|password|token|bearer|auth)[=:\s]+\S+/gi,
  /sk-[A-Za-z0-9]{20,}/g,
  /AIza[A-Za-z0-9_-]{35}/g,
  /ghp_[A-Za-z0-9]{36}/g,
];

function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

function classifyError(err: unknown): ErrorCategory {
  if (!err) return 'unknown';
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  if (msg.includes('fetch') || msg.includes('econnrefused') || msg.includes('network')) return 'api';
  if (msg.includes('enoent') || msg.includes('file') || msg.includes('path')) return 'filesystem';
  if (msg.includes('permission') || msg.includes('eperm') || msg.includes('eacces')) return 'security';
  if (msg.includes('timeout') || msg.includes('etimedout')) return 'timeout';
  if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('403')) return 'auth';
  if (msg.includes('lsp') || msg.includes('language server')) return 'lsp';
  if (msg.includes('plugin') || msg.includes('lua')) return 'plugin';
  if (msg.includes('storage') || msg.includes('sqlite') || msg.includes('leveldb')) return 'storage';
  if (msg.includes('model') || msg.includes('ollama') || msg.includes('inference')) return 'model_runtime';
  if (msg.includes('config') || msg.includes('setting')) return 'configuration';
  if (msg.includes('ipc') || msg.includes('channel') || msg.includes('preload')) return 'ipc';
  if (msg.includes('valid') || msg.includes('schema') || msg.includes('shape')) return 'validation';
  return 'unknown';
}

export function normalizeError(
  err: unknown,
  context: {
    code?: string;
    requestId?: string;
    source?: string;
    target?: string;
    recoverable?: boolean;
    userAction?: string;
  } = {}
): NeurodeckBackendError {
  const raw = err instanceof Error ? err : new Error(String(err));
  const category = classifyError(raw);
  const technicalDetails = redactSecrets(raw.stack || raw.message);

  const userMessages: Partial<Record<ErrorCategory, string>> = {
    api: 'The backend service is unreachable. Check that the NEURODECK sidecar is running.',
    filesystem: 'A file system operation failed. Check permissions and available disk space.',
    security: 'A permission error occurred. Check file and process permissions.',
    timeout: 'The operation timed out. The backend may be under load.',
    auth: 'Authentication failed. Check your API key configuration.',
    lsp: 'The language server could not complete the request.',
    plugin: 'A plugin operation failed. Check the plugin logs.',
    storage: 'A storage operation failed.',
    model_runtime: 'The model runtime is unavailable. Ensure Ollama or LM Studio is running.',
    configuration: 'A configuration value is missing or invalid.',
    ipc: 'An IPC communication error occurred.',
    validation: 'The request payload was invalid.',
  };

  return {
    code: context.code ?? `ERR_${category.toUpperCase()}`,
    message: redactSecrets(raw.message),
    category,
    recoverable: context.recoverable ?? true,
    userAction: context.userAction ?? userMessages[category],
    technicalDetails,
    requestId: context.requestId ?? `err-${Date.now()}`,
    source: context.source ?? 'unknown',
    target: context.target,
  };
}

export function isNonRecoverable(err: NeurodeckBackendError): boolean {
  return !err.recoverable || err.category === 'security';
}
