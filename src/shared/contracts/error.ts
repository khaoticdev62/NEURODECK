/** Normalized IPC error shape (mega-prompt §14.2). Renderer-visible details must be sanitized — never raw stack traces or absolute host paths beyond what the user already provided. */
export interface NdxError {
  code: string
  message: string
  userMessage: string
  category:
    | 'validation'
    | 'permission'
    | 'not-found'
    | 'conflict'
    | 'offline'
    | 'timeout'
    | 'provider'
    | 'system'
    | 'learning'
    | 'security'
    | 'unknown'
  retryable: boolean
  details?: Record<string, unknown>
  correlationId: string
}

export type NdxResult<T> = { ok: true; data: T } | { ok: false; error: NdxError }

let correlationSequence = 0

export function nextCorrelationId(): string {
  return `corr-${Date.now()}-${++correlationSequence}`
}

export function ndxError(
  category: NdxError['category'],
  code: string,
  userMessage: string,
  options: { message?: string; retryable?: boolean; details?: Record<string, unknown> } = {}
): NdxError {
  return {
    code,
    message: options.message ?? userMessage,
    userMessage,
    category,
    retryable: options.retryable ?? false,
    details: options.details,
    correlationId: nextCorrelationId()
  }
}
