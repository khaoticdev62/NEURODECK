/**
 * Unit tests — command template shape validation
 * Every command template across all language profiles must:
 * - Have an args array (never a raw shell string)
 * - Have a valid safety tier
 * - Have a cwdStrategy
 */
import { describe, it, expect } from 'vitest';
import { getAllProfiles } from '../../../src/renderer/shared/ide/languageProfiles';

const VALID_SAFETY = ['safe', 'confirm', 'dangerous', 'blocked'] as const;
const VALID_CWD_STRATEGY = ['workspaceRoot', 'fileDirectory', 'nearestPackageRoot', 'nearestGitRoot'] as const;

// Flatten all command templates from the object-of-categories structure
function collectAllCommands() {
  return getAllProfiles().flatMap((p) => {
    const categories = p.commands as Record<string, unknown[]>;
    return Object.entries(categories).flatMap(([_category, cmds]) =>
      (Array.isArray(cmds) ? cmds : []).map((c) => ({
        profileId: p.id,
        ...(c as Record<string, unknown>),
      }))
    );
  });
}

describe('CommandTemplate shape invariants', () => {
  const allCommands = collectAllCommands();

  it('loads at least 40 commands across all profiles', () => {
    expect(allCommands.length).toBeGreaterThanOrEqual(40);
  });

  it('every command has a non-empty id', () => {
    for (const cmd of allCommands) {
      expect(typeof cmd.id).toBe('string');
      expect((cmd.id as string).length).toBeGreaterThan(0);
    }
  });

  it('every command has a non-empty label', () => {
    for (const cmd of allCommands) {
      expect(typeof cmd.label).toBe('string');
      expect((cmd.label as string).length).toBeGreaterThan(0);
    }
  });

  it('every command.args is an array, not a shell string', () => {
    for (const cmd of allCommands) {
      expect(Array.isArray(cmd.args)).toBe(true);
    }
  });

  it('every command.command is a string', () => {
    for (const cmd of allCommands) {
      expect(typeof cmd.command).toBe('string');
      expect((cmd.command as string).length).toBeGreaterThan(0);
    }
  });

  it('every command has a valid safety tier', () => {
    for (const cmd of allCommands) {
      expect(VALID_SAFETY as readonly string[]).toContain(cmd.safety);
    }
  });

  it('every command has a valid cwdStrategy', () => {
    for (const cmd of allCommands) {
      expect(VALID_CWD_STRATEGY as readonly string[]).toContain(cmd.cwdStrategy);
    }
  });

  it('no command.command value contains shell pipe or redirect characters', () => {
    for (const cmd of allCommands) {
      // Shell metacharacters in the command binary itself indicate a string-embedded shell call
      expect(cmd.command as string).not.toMatch(/[|;&`$>]/);
    }
  });

  it('format/check/lint/clippy commands are generally safe', () => {
    const safeIds = ['fmt', 'format', 'check', 'lint', 'clippy', 'vet', 'typecheck', 'tsc'];
    const formatterCmds = allCommands.filter((c) =>
      safeIds.some((kw) => (c.id as string).includes(kw))
    );
    for (const cmd of formatterCmds) {
      expect(cmd.safety).toBe('safe');
    }
  });
});
