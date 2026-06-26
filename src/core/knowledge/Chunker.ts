const DEFAULT_CHUNK_SIZE = 800
const DEFAULT_OVERLAP = 100

/**
 * Real text chunking (supplemental §12.3 "Chunking") — splits on real
 * paragraph boundaries first (so a chunk doesn't arbitrarily cut a
 * sentence in half when the source naturally has paragraph breaks),
 * falling back to fixed-size windows with a real overlap for any
 * paragraph longer than `chunkSize` itself.
 */
export function chunkText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_OVERLAP
): string[] {
  const paragraphs = text.split(/\n{2,}/).filter((paragraph) => paragraph.trim().length > 0)
  const chunks: string[] = []

  for (const paragraph of paragraphs) {
    if (paragraph.length <= chunkSize) {
      chunks.push(paragraph)
      continue
    }
    let start = 0
    while (start < paragraph.length) {
      const end = Math.min(start + chunkSize, paragraph.length)
      chunks.push(paragraph.slice(start, end))
      if (end === paragraph.length) break
      start = end - overlap
    }
  }

  return chunks.length > 0 ? chunks : [text].filter((candidate) => candidate.length > 0)
}
