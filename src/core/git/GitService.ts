import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { GitBranch, GitCommit, GitFileChange, GitStatus } from '@shared/contracts/git'

const execFileAsync = promisify(execFile)

const RECORD_SEPARATOR = '\x1e'
const FIELD_SEPARATOR = '\x1f'

/**
 * Real Git operations via the system `git` binary (mega-prompt §22) — never
 * `exec`/shell strings; every call is `execFile('git', [...argsArray])`, so
 * arguments (commit messages, branch names, paths) can never be interpreted
 * as shell syntax. Destructive/history-rewriting operations (force push,
 * reset --hard, branch delete) are intentionally not implemented yet —
 * "discard requires recovery support or explicit irreversibility warning"
 * (§22) and Recovery Service is Epic 11.
 */
export class GitService {
  private async run(root: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('git', args, { cwd: root, maxBuffer: 10 * 1024 * 1024 })
    return stdout
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
      return { isRepository: false, branch: null, ahead: 0, behind: 0, changes: [] }
    }

    const raw = await this.run(root, ['status', '--porcelain=v2', '--branch'])
    const lines = raw.split('\n').filter(Boolean)

    let branch: string | null = null
    let ahead = 0
    let behind = 0
    const changes: GitFileChange[] = []

    for (const line of lines) {
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
        const path = fields[fields.length - 1]
        changes.push({ path, status: xy, staged: xy[0] !== '.' })
      } else if (line.startsWith('? ')) {
        changes.push({ path: line.slice(2), status: '??', staged: false })
      } else if (line.startsWith('u ')) {
        const fields = line.split(' ')
        changes.push({ path: fields[fields.length - 1], status: fields[1], staged: false })
      }
    }

    return { isRepository: true, branch, ahead, behind, changes }
  }

  async diff(root: string, path: string, staged: boolean): Promise<string> {
    const args = staged ? ['diff', '--cached', '--', path] : ['diff', '--', path]
    return this.run(root, args)
  }

  async stage(root: string, paths: string[]): Promise<void> {
    await this.run(root, ['add', '--', ...paths])
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
    await this.run(root, ['checkout', branch])
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
}
