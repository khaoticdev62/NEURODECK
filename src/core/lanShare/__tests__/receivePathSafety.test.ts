import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertSafeSymlinkTarget,
  resolveSafeDestination,
  UnsafeDestinationPathError
} from '../receivePathSafety'

describe('resolveSafeDestination', () => {
  const root = join('C:', 'staging', 'job-1')

  it('resolves a real, safe relative path under the staging root', () => {
    const resolved = resolveSafeDestination(root, 'project/src/index.ts')
    expect(resolved.startsWith(root)).toBe(true)
  })

  it('rejects a real path-traversal attempt', () => {
    expect(() => resolveSafeDestination(root, '../../etc/passwd')).toThrow(
      UnsafeDestinationPathError
    )
  })

  it('rejects an absolute path', () => {
    expect(() => resolveSafeDestination(root, '/etc/passwd')).toThrow(UnsafeDestinationPathError)
    expect(() => resolveSafeDestination(root, 'C:\\Windows\\System32')).toThrow(
      UnsafeDestinationPathError
    )
  })

  it('rejects a null byte', () => {
    expect(() => resolveSafeDestination(root, 'file\0.txt')).toThrow(UnsafeDestinationPathError)
  })

  it('rejects an empty relative path', () => {
    expect(() => resolveSafeDestination(root, '')).toThrow(UnsafeDestinationPathError)
  })

  it('rejects a sibling directory that merely shares the root as a string prefix', () => {
    // A real, classic traversal-check bypass: naive `startsWith(root)` would
    // wrongly accept "job-10" as being "inside" "job-1". The real fix
    // (checking `root + sep`) must keep rejecting this.
    expect(() => resolveSafeDestination(root, '../job-10/evil.txt')).toThrow(
      UnsafeDestinationPathError
    )
  })

  it('rejects deeply nested traversal mixed with otherwise-valid segments', () => {
    expect(() => resolveSafeDestination(root, 'a/b/c/../../../../../../etc/passwd')).toThrow(
      UnsafeDestinationPathError
    )
  })

  it('rejects a UNC-style path', () => {
    expect(() => resolveSafeDestination(root, '\\\\attacker-host\\share\\file.txt')).toThrow(
      UnsafeDestinationPathError
    )
  })
})

describe('assertSafeSymlinkTarget', () => {
  const root = join('C:', 'staging', 'job-1')

  it('allows a real symlink target that stays within the staging root', () => {
    expect(() => assertSafeSymlinkTarget(root, 'link.txt', 'real.txt')).not.toThrow()
  })

  it('rejects a symlink target that escapes the staging root', () => {
    expect(() => assertSafeSymlinkTarget(root, 'link.txt', '../../outside.txt')).toThrow(
      UnsafeDestinationPathError
    )
  })

  it('rejects an absolute symlink target outside the staging root', () => {
    expect(() => assertSafeSymlinkTarget(root, 'link.txt', '/etc/passwd')).toThrow(
      UnsafeDestinationPathError
    )
  })
})
