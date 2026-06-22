import { randomUUID } from 'node:crypto'
import { basename } from 'node:path'
import { spawn, type IDisposable, type IPty } from 'node-pty'
import type {
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalSession,
  TerminalSnapshot
} from '@shared/contracts/terminal'

const MAX_RUNNING_SESSIONS = 8
const MAX_OUTPUT_CHARS = 1024 * 1024
const SECRET_ENV_PATTERN = /(TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|AUTHORIZATION)/i

interface SessionRecord {
  info: TerminalSession
  pty: IPty
  output: string
  truncated: boolean
  sequence: number
  dataSubscription: IDisposable
  exitSubscription: IDisposable
}

export interface CreateTerminalOptions {
  workspaceId: string
  cwd: string
  cols: number
  rows: number
}

export class TerminalServiceError extends Error {
  constructor(
    readonly code: 'SESSION_NOT_FOUND' | 'SESSION_EXITED' | 'SESSION_LIMIT',
    message: string
  ) {
    super(message)
  }
}

/** Real multi-session PTY runtime. Interactive sessions never use child_process.exec. */
export class TerminalService {
  private readonly sessions = new Map<string, SessionRecord>()
  private readonly dataListeners = new Set<(event: TerminalDataEvent) => void>()
  private readonly exitListeners = new Set<(event: TerminalExitEvent) => void>()

  create(options: CreateTerminalOptions): TerminalSession {
    const runningCount = [...this.sessions.values()].filter(
      (record) => record.info.status === 'running'
    ).length
    if (runningCount >= MAX_RUNNING_SESSIONS) {
      throw new TerminalServiceError(
        'SESSION_LIMIT',
        `At most ${MAX_RUNNING_SESSIONS} terminal sessions may run at once.`
      )
    }

    const shell = defaultShell()
    const pty = spawn(shell, [], {
      name: 'xterm-256color',
      cwd: options.cwd,
      cols: options.cols,
      rows: options.rows,
      env: sanitizedEnvironment(),
      ...(process.platform === 'win32' ? { useConpty: true, useConptyDll: true } : {})
    })
    const info: TerminalSession = {
      id: randomUUID(),
      workspaceId: options.workspaceId,
      shell: basename(shell),
      cwd: options.cwd,
      pid: pty.pid,
      cols: options.cols,
      rows: options.rows,
      createdAt: Date.now(),
      status: 'running',
      exitCode: null
    }

    const record = {} as SessionRecord
    record.info = info
    record.pty = pty
    record.output = ''
    record.truncated = false
    record.sequence = 0
    record.dataSubscription = pty.onData((data) => {
      record.sequence += 1
      record.output += data
      if (record.output.length > MAX_OUTPUT_CHARS) {
        record.output = record.output.slice(-MAX_OUTPUT_CHARS)
        record.truncated = true
      }
      const event = { sessionId: info.id, data, sequence: record.sequence }
      for (const listener of this.dataListeners) listener(event)
    })
    record.exitSubscription = pty.onExit(({ exitCode }) => {
      record.info = { ...record.info, status: 'exited', exitCode }
      record.dataSubscription.dispose()
      for (const listener of this.exitListeners) listener({ session: { ...record.info } })
    })
    this.sessions.set(info.id, record)
    return { ...info }
  }

  list(workspaceId: string): TerminalSession[] {
    return [...this.sessions.values()]
      .filter((record) => record.info.workspaceId === workspaceId)
      .map((record) => ({ ...record.info }))
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  snapshot(sessionId: string): TerminalSnapshot {
    const record = this.requireSession(sessionId)
    return {
      session: { ...record.info },
      output: record.output,
      truncated: record.truncated,
      lastSequence: record.sequence
    }
  }

  write(sessionId: string, data: string): void {
    const record = this.requireRunningSession(sessionId)
    record.pty.write(data)
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const record = this.requireRunningSession(sessionId)
    record.pty.resize(cols, rows)
    record.info = { ...record.info, cols, rows }
  }

  terminate(sessionId: string): void {
    const record = this.requireRunningSession(sessionId)
    record.pty.kill()
  }

  onData(listener: (event: TerminalDataEvent) => void): () => void {
    this.dataListeners.add(listener)
    return () => this.dataListeners.delete(listener)
  }

  onExit(listener: (event: TerminalExitEvent) => void): () => void {
    this.exitListeners.add(listener)
    return () => this.exitListeners.delete(listener)
  }

  dispose(): void {
    for (const record of this.sessions.values()) {
      record.dataSubscription.dispose()
      record.exitSubscription.dispose()
      if (record.info.status === 'running') record.pty.kill()
    }
    this.sessions.clear()
    this.dataListeners.clear()
    this.exitListeners.clear()
  }

  private requireSession(sessionId: string): SessionRecord {
    const record = this.sessions.get(sessionId)
    if (!record) throw new TerminalServiceError('SESSION_NOT_FOUND', 'Terminal session not found.')
    return record
  }

  private requireRunningSession(sessionId: string): SessionRecord {
    const record = this.requireSession(sessionId)
    if (record.info.status !== 'running') {
      throw new TerminalServiceError('SESSION_EXITED', 'Terminal session has already exited.')
    }
    return record
  }
}

function defaultShell(): string {
  if (process.platform === 'win32') return process.env['COMSPEC'] ?? 'cmd.exe'
  return process.env['SHELL'] ?? '/bin/sh'
}

function sanitizedEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && !SECRET_ENV_PATTERN.test(entry[0])
    )
  )
}
