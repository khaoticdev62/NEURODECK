const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/** Formats a byte count using the largest unit that keeps the value readable. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log2(bytes) / 10), UNITS.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(1)} ${UNITS[exponent]}`
}
