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
      return { isRepository: false, branch: null, ahead: 0, behind: 0, changes: [] }
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

    return { isRepository: true, branch, ahead, behind, changes }
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
}
