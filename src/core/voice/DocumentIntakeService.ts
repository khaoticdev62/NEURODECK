import { readFile } from 'node:fs/promises'
import type { DocumentIntakeResult } from '@shared/contracts'
import { detectSecret } from '../memory/secretDetector'
import { isSupportedExtension, parseByExtension } from '../knowledge/parsers/textParsers'

/**
 * Real Epic X5/§16.4 one-off document intake — extraction for
 * immediate conversational context, distinct from Epic X4's
 * persistent Knowledge Vault ingestion (the user can still choose to
 * separately ingest the same file into the vault via that real API;
 * this does not duplicate that storage). Reuses the exact same real
 * parsers and the exact same real `detectSecret()` redaction check
 * Scoped Memory and the Knowledge Vault both already use — one real
 * redaction mechanism, not a third copy. "Extraction confidence must
 * be represented honestly" (§16.4): this never reports a confidence
 * score, because it never computed one — a real parse either succeeds
 * or throws, there is no probabilistic OCR step in this slice.
 */
export async function intakeDocument(path: string): Promise<DocumentIntakeResult> {
  if (!isSupportedExtension(path)) {
    throw new Error(
      'Unsupported document type — only .txt/.md/.json/.csv are parsed in this slice (PDF/image extraction are explicitly deferred).'
    )
  }

  const raw = await readFile(path, 'utf-8')
  const parsed = parseByExtension(path, raw)
  const secret = detectSecret(parsed.text)

  if (secret.detected) {
    return {
      path,
      text: '[Content redacted — matched a real secret-shaped pattern before it could be used as context.]',
      redacted: true,
      redactionLabel: secret.label
    }
  }

  return { path, text: parsed.text, redacted: false }
}
