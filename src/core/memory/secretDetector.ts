/**
 * Real secret-shape detection (supplemental §13.4 "Do not store:
 * Secrets, Passwords, Private keys, Access tokens... Temporary
 * authentication data") — used to reject a memory write *before* it
 * reaches disk, and reused by the Knowledge Vault ingestion pipeline's
 * "Secret and sensitive-data detection" step (§12.3). Pattern-based
 * detection is inherently a real, honest best-effort, not a perfect
 * guarantee — it is the same category of defense as a pre-commit
 * secret scanner, not a claim of complete coverage.
 */
const SECRET_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { label: 'JWT', pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
  { label: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  {
    label: 'generic API key assignment',
    pattern: /\b(api[_-]?key|secret|token|password|passwd)\s*[:=]\s*['"][^\s'"]{8,}['"]/i
  },
  { label: 'Bearer token', pattern: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/ },
  { label: 'high-entropy base64 blob', pattern: /\b[A-Za-z0-9+/]{40,}={0,2}\b/ }
]

export interface SecretDetectionResult {
  detected: boolean
  label?: string
}

export function detectSecret(content: string): SecretDetectionResult {
  for (const { label, pattern } of SECRET_PATTERNS) {
    if (pattern.test(content)) return { detected: true, label }
  }
  return { detected: false }
}
