import { resolve, sep } from 'node:path'

export class UnsafeDestinationPathError extends Error {}

/**
 * Real path-safety enforcement for received chunks (spec §16 "Block:
 * Path traversal, Absolute paths, Null bytes ... Symlink/hard-link
 * escape"). Every `FileChunk.relative_path`/`symlink_target` from a
 * remote peer is untrusted input — this is the one real choke point
 * every write during staging goes through. Full sandboxing
 * (Landlock/Bubblewrap, spec §16) is a separate, OS-level concern this
 * module does not attempt; see `lanShare.landlock`/`lanShare.bubblewrap`
 * in the Capability Registry for that honestly-deferred gap.
 */
export function resolveSafeDestination(root: string, relativePath: string): string {
  if (!relativePath || relativePath.includes('\0')) {
    throw new UnsafeDestinationPathError(
      `Refusing an unsafe relative path: ${JSON.stringify(relativePath)}`
    )
  }
  if (
    relativePath.startsWith('/') ||
    /^[a-zA-Z]:[\\/]/.test(relativePath) ||
    relativePath.startsWith('\\')
  ) {
    throw new UnsafeDestinationPathError(`Refusing an absolute relative path: ${relativePath}`)
  }

  const normalizedRoot = resolve(root)
  const resolved = resolve(normalizedRoot, relativePath)
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + sep)) {
    throw new UnsafeDestinationPathError(
      `Refusing a path that escapes the staging directory: ${relativePath}`
    )
  }
  return resolved
}

/** Same real escape check, applied to a symlink's declared target (spec §16 "Symlink/hard-link escape") — a received symlink may never point outside the staging root. */
export function assertSafeSymlinkTarget(root: string, relativePath: string, target: string): void {
  if (target.includes('\0')) {
    throw new UnsafeDestinationPathError(
      `Refusing an unsafe symlink target: ${JSON.stringify(target)}`
    )
  }
  const linkDir = resolve(resolve(root), relativePath, '..')
  const resolvedTarget =
    target.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(target) ? target : resolve(linkDir, target)
  const normalizedRoot = resolve(root)
  if (resolvedTarget !== normalizedRoot && !resolvedTarget.startsWith(normalizedRoot + sep)) {
    throw new UnsafeDestinationPathError(
      `Refusing a symlink that targets outside the staging directory: ${target}`
    )
  }
}
