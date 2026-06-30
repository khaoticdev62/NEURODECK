import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {
  isUnmergedStatus,
  type GitBranch,
  type GitCommit,
  type GitFileChange,
  type GitRemote,
  type GitStashEntry,
  type GitStatus
} from '@shared/contracts/git'

const execFileAsync = promisify(execFile)

const RECORD_SEPARATOR = '\x1e'
const FIELD_SEPARATOR = '\x1f'

/**
 * Real Git operations via the system `git` binary (mega-prompt §22) — never
 * `exec`/shell strings; every call is `execFile('git', [...argsArray])`, so
 * arguments (commit messages, branch names, paths) can never be interpreted
 * as shell syntax. Restore/discard, branch delete, and force push were
 * previously deferred pending Recovery Service (Epic 11) and a real
 * irreversibility-warning UI — both now exist, so this slice implements
 * them: `restore()` itself does not checkpoint (that needs the file's
 * pre-discard content, which only the IPC handler can read alongside
 * `RecoveryService` — see `registerGitHandlers.ts`), and `forcePush()` uses
 * `--force-with-lease`, never raw `--force`, so it fails closed instead of
 * silently clobbering a concurrent push from someone else.
 */
export class GitService {
  private async run(root: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('git', args, { cwd: root, maxBuffer: 10 * 1024 * 1024 })
    return stdout
  }

  private async runDiff(root: string, args: string[]): Promise<string> {
    try {
      return await this.run(root, args)
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 1 &&
        'stdout' in error &&
        typeof error.stdout === 'string'
      ) {
        return error.stdout
      }
      throw error
    }
  }

  async isRepository(root: string): Promise<boolean> {
    try {
      const output = await this.run(root, ['rev-parse', '--is-inside-work-tree'])
      return output.trim() === 'true'
    } catch {
      return false
    }
  }

  async status(root: string): Promise<GitStatus> {
    if (!(await this.isRepository(root))) {
      return {
        isRepository: false,
        branch: null,
        ahead: 0,
        behind: 0,
        changes: [],
        hasConflicts: false
      }
    }

    const raw = await this.run(root, ['status', '--porcelain=v2', '--branch', '-z'])
    const records = raw.split('\0').filter(Boolean)

    let branch: string | null = null
    let ahead = 0
    let behind = 0
    const changes: GitFileChange[] = []

    for (let index = 0; index < records.length; index += 1) {
      const line = records[index]
      if (line.startsWith('# branch.head ')) {
        const name = line.slice('# branch.head '.length)
        branch = name === '(detached)' ? null : name
      } else if (line.startsWith('# branch.ab ')) {
        const match = line.match(/\+(\d+) -(\d+)/)
        if (match) {
          ahead = Number(match[1])
          behind = Number(match[2])
        }
      } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
        const fields = line.split(' ')
        const xy = fields[1]
        const pathFieldIndex = line.startsWith('2 ') ? 9 : 8
        const path = fields.slice(pathFieldIndex).join(' ')
        if (xy[0] !== '.') changes.push({ path, status: xy, staged: true })
        if (xy[1] !== '.') changes.push({ path, status: xy, staged: false })
        if (line.startsWith('2 ')) index += 1
      } else if (line.startsWith('? ')) {
        changes.push({ path: line.slice(2), status: '??', staged: false })
      } else if (line.startsWith('u ')) {
        const fields = line.split(' ')
        changes.push({ path: fields.slice(10).join(' '), status: fields[1], staged: false })
      }
    }

    const hasConflicts = changes.some((change) => isUnmergedStatus(change.status))
    return { isRepository: true, branch, ahead, behind, changes, hasConflicts }
  }

  async diff(root: string, path: string, staged: boolean): Promise<string> {
    const args = staged ? ['diff', '--cached', '--', path] : ['diff', '--', path]
    const diff = await this.run(root, args)
    if (diff || staged) return diff

    try {
      await this.run(root, ['ls-files', '--error-unmatch', '--', path])
      return diff
    } catch {
      return this.runDiff(root, ['diff', '--no-index', '--', '/dev/null', path])
    }
  }

  async stage(root: string, paths: string[]): Promise<void> {
    await this.run(root, ['add', '--', ...paths])
  }

  /** Real merge-conflict resolution (mega-prompt §22's named gap). `git checkout --ours/--theirs` restores the chosen side's content into the working tree; staging afterward is what actually marks the path resolved for the in-progress merge/rebase, matching real `git` semantics — not a NeuroDeck-invented shortcut. */
  async resolveConflict(root: string, path: string, resolution: 'ours' | 'theirs'): Promise<void> {
    await this.run(root, ['checkout', `--${resolution}`, '--', path])
    await this.run(root, ['add', '--', path])
  }

  async unstage(root: string, paths: string[]): Promise<void> {
    try {
      await this.run(root, ['restore', '--staged', '--', ...paths])
    } catch (error) {
      // `restore --staged` needs a resolvable HEAD; a brand-new repo with no
      // commits yet has none. `rm --cached` un-stages without touching the
      // working tree regardless of whether HEAD exists.
      if (error instanceof Error && error.message.includes("could not resolve 'HEAD'")) {
        await this.run(root, ['rm', '--cached', '--', ...paths])
        return
      }
      throw error
    }
  }

  async commit(root: string, message: string): Promise<void> {
    await this.run(root, ['commit', '-m', message])
  }

  async branches(root: string): Promise<GitBranch[]> {
    const raw = await this.run(root, ['branch', '--format=%(HEAD)%(refname:short)'])
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        // %(HEAD) always emits exactly one character — '*' for the current
        // branch, a single space otherwise — so the name always starts at
        // index 1, never index 0.
        return { name: line.slice(1), current: line[0] === '*' }
      })
  }

  async checkout(root: string, branch: string): Promise<void> {
    const exists = (await this.branches(root)).some((candidate) => candidate.name === branch)
    if (!exists) throw new Error(`Local branch does not exist: ${branch}`)
    await this.run(root, ['checkout', '--no-guess', branch, '--'])
  }

  async log(root: string, limit = 50): Promise<GitCommit[]> {
    const format = ['%H', '%h', '%an', '%aI', '%s'].join(FIELD_SEPARATOR) + RECORD_SEPARATOR
    const raw = await this.run(root, ['log', `-n${limit}`, `--pretty=format:${format}`])
    return raw
      .split(RECORD_SEPARATOR)
      .map((record) => record.replace(/^\n/, ''))
      .filter(Boolean)
      .map((record) => {
        const [hash, shortHash, author, date, message] = record.split(FIELD_SEPARATOR)
        return { hash, shortHash, author, date, message }
      })
  }

  async remotes(root: string): Promise<GitRemote[]> {
    const raw = await this.run(root, ['remote', '-v'])
    const byName = new Map<string, GitRemote>()
    for (const line of raw.split('\n').filter(Boolean)) {
      const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/)
      if (!match) continue
      const [, name, url, kind] = match
      const remote = byName.get(name) ?? { name, fetchUrl: '', pushUrl: '' }
      if (kind === 'fetch') remote.fetchUrl = url
      else remote.pushUrl = url
      byName.set(name, remote)
    }
    return [...byName.values()]
  }

  private async assertKnownRemote(root: string, remote: string): Promise<void> {
    const exists = (await this.remotes(root)).some((candidate) => candidate.name === remote)
    if (!exists) throw new Error(`Unknown remote: ${remote}`)
  }

  async fetch(root: string, remote: string): Promise<void> {
    await this.assertKnownRemote(root, remote)
    await this.run(root, ['fetch', remote])
  }

  async pull(root: string, remote: string, branch: string): Promise<void> {
    await this.assertKnownRemote(root, remote)
    await this.run(root, ['pull', '--no-rebase', remote, branch])
  }

  /** Never force-pushes — force push is critical risk per mega-prompt §22 and is not implemented. */
  async push(root: string, remote: string, branch: string): Promise<void> {
    await this.assertKnownRemote(root, remote)
    await this.run(root, ['push', remote, branch])
  }

  async stashSave(root: string, message?: string): Promise<void> {
    const args = message ? ['stash', 'push', '-m', message] : ['stash', 'push']
    await this.run(root, args)
  }

  async stashList(root: string): Promise<GitStashEntry[]> {
    const format = '%gd' + FIELD_SEPARATOR + '%gs' + RECORD_SEPARATOR
    const raw = await this.run(root, ['stash', 'list', `--pretty=format:${format}`])
    return raw
      .split(RECORD_SEPARATOR)
      .filter(Boolean)
      .map((record, index) => {
        const [, message] = record.replace(/^\n/, '').split(FIELD_SEPARATOR)
        return { index, message }
      })
  }

  async stashPop(root: string, index: number): Promise<void> {
    await this.run(root, ['stash', 'pop', `stash@{${index}}`])
  }

  /**
   * Discards real, uncommitted changes to tracked files back to their
   * `HEAD` content. Only tracked changes — untracked ('??') files have no
   * committed content to restore to, so `git restore` correctly rejects
   * them; deleting an untracked file is a different, undesigned operation
   * this method does not attempt. Callers (see `registerGitHandlers.ts`)
   * must record a recovery checkpoint of each path's current content
   * before calling this — `GitService` itself has no `RecoveryService`
   * dependency, by design (mirrors `registerFileHandlers.ts`'s `fileWrite`
   * orchestration rather than coupling the two services together).
   */
  async restore(root: string, paths: string[]): Promise<void> {
    await this.run(root, ['restore', '--', ...paths])
  }

  async createBranch(root: string, name: string, fromRef?: string): Promise<void> {
    const args = fromRef ? ['branch', name, fromRef] : ['branch', name]
    await this.run(root, args)
  }

  /** `-d` (safe) refuses to delete a branch with unmerged commits; `-D` (force) deletes regardless — callers must surface that distinction to the user, not silently force. */
  async deleteBranch(root: string, name: string, force: boolean): Promise<void> {
    await this.run(root, ['branch', force ? '-D' : '-d', name])
  }

  /** `--force-with-lease` instead of `--force` — refuses to overwrite the remote branch if it moved since our last fetch, rather than blindly clobbering history someone else may have pushed in the meantime. */
  async forcePush(root: string, remote: string, branch: string): Promise<void> {
    await this.assertKnownRemote(root, remote)
    await this.run(root, ['push', '--force-with-lease', remote, branch])
  }
}
