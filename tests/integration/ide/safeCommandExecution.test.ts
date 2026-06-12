/**
 * Integration tests — safe command execution service
 * Tests the security boundary: blocked patterns, confirmation tiers,
 * and spawn-with-args-array enforcement.
 */
import { describe, it, expect } from 'vitest';

const {
  SafeCommandExecutionService,
  BLOCKED_COMMANDS,
  CONFIRM_COMMAND_PREFIXES,
  DANGEROUS_COMMAND_PREFIXES,
} = require('../../../electron/services/ide/safeCommandExecutionService');

describe('classifyCommand — blocked tier', () => {
  const service = new SafeCommandExecutionService();

  it('blocks curl | sh', () => {
    expect(service.classifyCommand('curl', ['|', 'sh'])).toBe('blocked');
  });

  it('blocks curl | bash', () => {
    expect(service.classifyCommand('curl', ['|', 'bash'])).toBe('blocked');
  });

  it('blocks rm -rf /', () => {
    expect(service.classifyCommand('rm', ['-rf', '/'])).toBe('blocked');
  });

  it('blocks sudo rm', () => {
    expect(service.classifyCommand('sudo', ['rm', '-rf', 'stuff'])).toBe('blocked');
  });

  it('blocks fork bomb pattern', () => {
    // Fork bomb is detected in the full joined string
    expect(service.classifyCommand('bash', ['-c', ':(){ :|:& };:'])).toBe('blocked');
  });

  it('blocks mimikatz', () => {
    expect(service.classifyCommand('mimikatz', [])).toBe('blocked');
  });

  it('BLOCKED_COMMANDS list is non-empty', () => {
    expect(Array.isArray(BLOCKED_COMMANDS)).toBe(true);
    expect(BLOCKED_COMMANDS.length).toBeGreaterThan(0);
  });
});

describe('classifyCommand — dangerous tier', () => {
  const service = new SafeCommandExecutionService();

  it('classifies rm -rf as dangerous', () => {
    expect(service.classifyCommand('rm', ['-rf', 'dist'])).toBe('dangerous');
  });

  it('classifies git reset --hard as dangerous', () => {
    expect(service.classifyCommand('git', ['reset', '--hard', 'HEAD'])).toBe('dangerous');
  });

  it('classifies sudo as dangerous', () => {
    expect(service.classifyCommand('sudo', ['apt', 'install', 'nginx'])).toBe('dangerous');
  });

  it('classifies drop database as dangerous', () => {
    expect(service.classifyCommand('drop', ['database', 'mydb'])).toBe('dangerous');
  });
});

describe('classifyCommand — confirm tier', () => {
  const service = new SafeCommandExecutionService();

  it('classifies npm install as confirm', () => {
    expect(service.classifyCommand('npm', ['install'])).toBe('confirm');
  });

  it('classifies pnpm add as confirm', () => {
    expect(service.classifyCommand('pnpm', ['add', 'react'])).toBe('confirm');
  });

  it('classifies pip install as confirm', () => {
    expect(service.classifyCommand('pip', ['install', 'numpy'])).toBe('confirm');
  });

  it('classifies cargo add as confirm', () => {
    expect(service.classifyCommand('cargo', ['add', 'serde'])).toBe('confirm');
  });

  it('classifies git reset (without --hard) as confirm', () => {
    expect(service.classifyCommand('git', ['reset', 'HEAD~1'])).toBe('confirm');
  });

  it('classifies chmod as confirm', () => {
    expect(service.classifyCommand('chmod', ['+x', 'script.sh'])).toBe('confirm');
  });
});

describe('classifyCommand — safe tier', () => {
  const service = new SafeCommandExecutionService();

  it('classifies cargo build as safe', () => {
    expect(service.classifyCommand('cargo', ['build'])).toBe('safe');
  });

  it('classifies cargo test as safe', () => {
    expect(service.classifyCommand('cargo', ['test'])).toBe('safe');
  });

  it('classifies cargo clippy as safe', () => {
    expect(service.classifyCommand('cargo', ['clippy'])).toBe('safe');
  });

  it('classifies cargo fmt as safe', () => {
    expect(service.classifyCommand('cargo', ['fmt'])).toBe('safe');
  });

  it('classifies go build as safe', () => {
    expect(service.classifyCommand('go', ['build', './...'])).toBe('safe');
  });

  it('classifies go test as safe', () => {
    expect(service.classifyCommand('go', ['test', './...'])).toBe('safe');
  });

  it('classifies npx tsc as safe', () => {
    expect(service.classifyCommand('npx', ['tsc', '--noEmit'])).toBe('safe');
  });

  it('classifies python -m pytest as safe', () => {
    expect(service.classifyCommand('python', ['-m', 'pytest'])).toBe('safe');
  });
});

describe('execute — blocked command rejection', () => {
  it('rejects a blocked command without spawning', () => new Promise<void>((resolve) => {
    const service = new SafeCommandExecutionService();
    const outputs: string[] = [];

    service.execute({
      commandId: 'test-blocked',
      command: 'rm',
      args: ['-rf', '/'],
      cwd: process.cwd(),
      safety: 'dangerous',
      label: 'Wipe filesystem',
      onOutput: (_type: string, data: string) => { outputs.push(data); },
      onExit: (code: number | null) => {
        expect(code).toBe(1);
        expect(outputs.some((o) => o.includes('BLOCKED'))).toBe(true);
        resolve();
      },
    });
  }));

  it('rejects when caller declares safe but command is confirm-tier', () => new Promise<void>((resolve) => {
    const service = new SafeCommandExecutionService();
    const outputs: string[] = [];

    service.execute({
      commandId: 'test-policy',
      command: 'npm',
      args: ['install'],
      cwd: process.cwd(),
      safety: 'safe',
      label: 'npm install',
      onOutput: (_type: string, data: string) => { outputs.push(data); },
      onExit: (code: number | null) => {
        expect(code).toBe(1);
        expect(outputs.some((o) => o.includes('POLICY'))).toBe(true);
        resolve();
      },
    });
  }));
});

describe('execute — args array enforcement', () => {
  it('spawns an echo command using args array and receives output', () => new Promise<void>((resolve) => {
    const service = new SafeCommandExecutionService();
    const outputs: string[] = [];

    service.execute({
      commandId: 'test-echo',
      command: 'node',
      args: ['-e', 'process.stdout.write("hello-nd")'],
      cwd: process.cwd(),
      safety: 'safe',
      label: 'node echo',
      onOutput: (_type: string, data: string) => { outputs.push(data); },
      onExit: (code: number | null) => {
        expect(code).toBe(0);
        expect(outputs.join('')).toContain('hello-nd');
        resolve();
      },
    });
  }), 10000);
});

describe('cancel', () => {
  it('returns false for a non-existent commandId', () => {
    const service = new SafeCommandExecutionService();
    expect(service.cancel('does-not-exist')).toBe(false);
  });
});

describe('getHistory', () => {
  it('records executed commands', () => new Promise<void>((resolve) => {
    const service = new SafeCommandExecutionService();

    service.execute({
      commandId: 'hist-test',
      command: 'node',
      args: ['-e', ''],
      cwd: process.cwd(),
      safety: 'safe',
      label: 'history test',
      onOutput: () => {},
      onExit: () => {
        const history = service.getHistory();
        expect(history.length).toBeGreaterThan(0);
        const entry = history.find((h: any) => h.commandId === 'hist-test');
        expect(entry).toBeDefined();
        expect(entry.label).toBe('history test');
        resolve();
      },
    });
  }), 10000);
});
