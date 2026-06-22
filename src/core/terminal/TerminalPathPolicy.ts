import { realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'

export class TerminalPathOutsideWorkspaceError extends Error {}

/** Resolves a terminal cwd and rejects traversal or symlink escapes from the workspace. */
export async function resolveTerminalCwd(root: string, relativeCwd = ''): Promise<string> {
  const realRoot = await realpath(root)
  const candidate = await realpath(resolve(realRoot, relativeCwd))
  const fromRoot = relative(realRoot, candidate)
  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
    throw new TerminalPathOutsideWorkspaceError()
  }
  if (!(await stat(candidate)).isDirectory()) throw new TerminalPathOutsideWorkspaceError()
  return candidate
}
