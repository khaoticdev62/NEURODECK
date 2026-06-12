'use strict';
/**
 * Safe Command Execution Service
 *
 * All commands spawned via this service use args arrays (never shell string
 * concatenation). Commands are classified as safe / confirm / dangerous /
 * blocked before execution.
 *
 * Runs entirely in the Electron main process.
 */

const { spawn } = require('child_process');
const { randomUUID } = require('crypto');

// ── Blocked patterns (never executed) ──────────────────────────────────────
const BLOCKED_COMMANDS = [
  // Shell injection patterns
  'curl | sh',
  'curl | bash',
  'wget | sh',
  'wget | bash',
  // Recursive destructive operations
  'rm -rf /',
  'sudo rm',
  'del /f /s /q c:\\',
  'rmdir /s /q c:\\',
  // Dangerous privilege escalation
  'sudo chmod -R 777',
  'chmod -R 777',
  // Fork bombs
  ':(){ :|:& };:',
  // Credential dumping
  'mimikatz',
  'hashdump',
];

// ── Commands requiring explicit user confirmation ───────────────────────────
const CONFIRM_COMMAND_PREFIXES = [
  'npm install',
  'npm uninstall',
  'npm ci',
  'pnpm install',
  'pnpm remove',
  'pnpm add',
  'yarn',
  'bun install',
  'cargo add',
  'cargo remove',
  'cargo update',
  'go mod tidy',
  'go get',
  'pip install',
  'pip uninstall',
  'python -m pip install',
  'python -m venv',
  'bash ',
  'sh ',
  'pwsh ',
  'chmod',
  'chown',
  'git reset',
  'git clean',
  'git push --force',
  'make install',
  'mvn install',
  'gradle',
  'dotnet add',
  'dotnet restore',
];

// ── Commands requiring typed confirmation ──────────────────────────────────
const DANGEROUS_COMMAND_PREFIXES = [
  'rm -rf',
  'del /f',
  'rmdir',
  'drop database',
  'drop table',
  'git reset --hard',
  'git clean -fd',
  'git push --force --all',
  'sudo',
];

const MAX_HISTORY = 50;
const DEFAULT_TIMEOUT_MS = 60_000;

class SafeCommandExecutionService {
  constructor() {
    /** @type {Map<string, import('child_process').ChildProcess>} */
    this._processes = new Map();
    /** @type {Array<object>} */
    this._history = [];
  }

  /**
   * Classify a command string for safety.
   * @param {string} command
   * @param {string[]} args
   * @returns {'safe' | 'confirm' | 'dangerous' | 'blocked'}
   */
  classifyCommand(command, args) {
    const full = [command, ...args].join(' ').toLowerCase();

    for (const blocked of BLOCKED_COMMANDS) {
      if (full.includes(blocked.toLowerCase())) return 'blocked';
    }
    for (const dangerous of DANGEROUS_COMMAND_PREFIXES) {
      if (full.startsWith(dangerous.toLowerCase())) return 'dangerous';
    }
    for (const confirm of CONFIRM_COMMAND_PREFIXES) {
      if (full.startsWith(confirm.toLowerCase())) return 'confirm';
    }
    return 'safe';
  }

  /**
   * Execute a command.
   * @param {object} opts
   * @param {string} opts.commandId
   * @param {string} opts.command
   * @param {string[]} opts.args
   * @param {string} opts.cwd
   * @param {string} opts.safety  - Caller's declared safety tier (must match or be stricter)
   * @param {string} opts.label
   * @param {Function} opts.onOutput  - (type: 'stdout'|'stderr', data: string) => void
   * @param {Function} opts.onExit   - (code: number | null) => void
   * @param {number} [opts.timeoutMs]
   * @returns {{ commandId: string, startedAt: string }}
   */
  execute(opts) {
    const {
      commandId,
      command,
      args,
      cwd,
      safety,
      label,
      onOutput,
      onExit,
      timeoutMs = DEFAULT_TIMEOUT_MS,
    } = opts;

    // Verify safety tier
    const actualSafety = this.classifyCommand(command, args);
    if (actualSafety === 'blocked') {
      const err = `[BLOCKED] "${label}" is not permitted: ${command} ${args.join(' ')}`;
      onOutput('stderr', err);
      onExit(1);
      return { commandId, startedAt: new Date().toISOString() };
    }

    // If caller said 'safe' but we classify as 'confirm'/'dangerous', reject
    if (safety === 'safe' && (actualSafety === 'confirm' || actualSafety === 'dangerous')) {
      const err = `[POLICY] "${label}" requires confirmation before execution.`;
      onOutput('stderr', err);
      onExit(1);
      return { commandId, startedAt: new Date().toISOString() };
    }

    const startedAt = new Date().toISOString();
    const historyEntry = { commandId, command, args, cwd, safety, label, startedAt, exitCode: null };

    const proc = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this._processes.set(commandId, proc);

    const timer = setTimeout(() => {
      if (this._processes.has(commandId)) {
        proc.kill('SIGTERM');
        onOutput('stderr', `[TIMEOUT] Command exceeded ${timeoutMs}ms`);
      }
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => onOutput('stdout', chunk.toString()));
    proc.stderr.on('data', (chunk) => onOutput('stderr', chunk.toString()));

    proc.on('close', (code) => {
      clearTimeout(timer);
      this._processes.delete(commandId);
      historyEntry.exitCode = code;
      historyEntry.endedAt = new Date().toISOString();
      this._addHistory(historyEntry);
      onExit(code);
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      this._processes.delete(commandId);
      onOutput('stderr', `[ERROR] ${err.message}`);
      onExit(1);
    });

    return { commandId, startedAt };
  }

  /**
   * Cancel a running command by ID.
   * @param {string} commandId
   * @returns {boolean} true if a process was found and signalled
   */
  cancel(commandId) {
    const proc = this._processes.get(commandId);
    if (!proc) return false;
    proc.kill('SIGTERM');
    this._processes.delete(commandId);
    return true;
  }

  /**
   * Get recent command history.
   * @returns {object[]}
   */
  getHistory() {
    return [...this._history];
  }

  _addHistory(entry) {
    this._history.unshift(entry);
    if (this._history.length > MAX_HISTORY) {
      this._history.pop();
    }
  }
}

const safeCommandExecutionService = new SafeCommandExecutionService();

module.exports = {
  safeCommandExecutionService,
  SafeCommandExecutionService,
  BLOCKED_COMMANDS,
  CONFIRM_COMMAND_PREFIXES,
  DANGEROUS_COMMAND_PREFIXES,
};
