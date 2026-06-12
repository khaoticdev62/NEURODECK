/**
 * Unit tests — project detection service
 * Tests the Electron main-process service that reads workspace root
 * config files and infers language, package manager, and git state.
 *
 * Uses a real temp-dir fixture populated with known config files so
 * that the detection logic runs against the filesystem (no mocks).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// CJS require — the service is a Node CJS module, not ESM
const { detectProject } = require('../../../electron/services/ide/projectDetectionService');

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nd-project-detect-'));
}

function writeTempFile(dir: string, name: string, content = ''): void {
  fs.writeFileSync(path.join(dir, name), content, 'utf8');
}

function cleanTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('detectProject — package managers', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { cleanTempDir(tmpDir); });

  it('detects npm via package-lock.json', async () => {
    writeTempFile(tmpDir, 'package.json', JSON.stringify({ name: 'test', scripts: { build: 'tsc' } }));
    writeTempFile(tmpDir, 'package-lock.json');
    const ctx = await detectProject(tmpDir);
    expect(ctx.packageManager).toBe('npm');
  });

  it('detects pnpm via pnpm-lock.yaml', async () => {
    writeTempFile(tmpDir, 'package.json', '{}');
    writeTempFile(tmpDir, 'pnpm-lock.yaml');
    const ctx = await detectProject(tmpDir);
    expect(ctx.packageManager).toBe('pnpm');
  });

  it('detects yarn via yarn.lock', async () => {
    writeTempFile(tmpDir, 'package.json', '{}');
    writeTempFile(tmpDir, 'yarn.lock');
    const ctx = await detectProject(tmpDir);
    expect(ctx.packageManager).toBe('yarn');
  });

  it('detects bun via bun.lockb', async () => {
    writeTempFile(tmpDir, 'package.json', '{}');
    writeTempFile(tmpDir, 'bun.lockb');
    const ctx = await detectProject(tmpDir);
    expect(ctx.packageManager).toBe('bun');
  });

  it('returns none for no lockfile', async () => {
    const ctx = await detectProject(tmpDir);
    expect(ctx.packageManager).toBe('none');
  });
});

describe('detectProject — language detection', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { cleanTempDir(tmpDir); });

  it('detects typescript from tsconfig.json', async () => {
    writeTempFile(tmpDir, 'tsconfig.json', '{}');
    const ctx = await detectProject(tmpDir);
    expect(ctx.detectedLanguages).toContain('typescript');
  });

  it('detects rust from Cargo.toml', async () => {
    writeTempFile(tmpDir, 'Cargo.toml', '[package]\nname = "test"');
    const ctx = await detectProject(tmpDir);
    expect(ctx.detectedLanguages).toContain('rust');
  });

  it('detects python from pyproject.toml', async () => {
    writeTempFile(tmpDir, 'pyproject.toml', '[tool.pytest]');
    const ctx = await detectProject(tmpDir);
    expect(ctx.detectedLanguages).toContain('python');
  });

  it('detects python from requirements.txt', async () => {
    writeTempFile(tmpDir, 'requirements.txt', 'requests\nnumpy\n');
    const ctx = await detectProject(tmpDir);
    expect(ctx.detectedLanguages).toContain('python');
  });

  it('detects go from go.mod', async () => {
    writeTempFile(tmpDir, 'go.mod', 'module example.com/test\n\ngo 1.21\n');
    const ctx = await detectProject(tmpDir);
    expect(ctx.detectedLanguages).toContain('go');
  });

  it('detects multiple languages from mixed files', async () => {
    writeTempFile(tmpDir, 'package.json', '{}');
    writeTempFile(tmpDir, 'tsconfig.json', '{}');
    const ctx = await detectProject(tmpDir);
    expect(ctx.detectedLanguages).toContain('typescript');
    expect(ctx.detectedLanguages).toContain('javascript');
  });
});

describe('detectProject — git detection', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { cleanTempDir(tmpDir); });

  it('detects .git directory', async () => {
    fs.mkdirSync(path.join(tmpDir, '.git'));
    const ctx = await detectProject(tmpDir);
    expect(ctx.hasGit).toBe(true);
  });

  it('returns hasGit: false without .git', async () => {
    const ctx = await detectProject(tmpDir);
    expect(ctx.hasGit).toBe(false);
  });
});

describe('detectProject — package.json scripts', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { cleanTempDir(tmpDir); });

  it('reads scripts from package.json', async () => {
    const scripts = { dev: 'vite', build: 'vite build', test: 'vitest' };
    writeTempFile(tmpDir, 'package.json', JSON.stringify({ scripts }));
    const ctx = await detectProject(tmpDir);
    expect(ctx.availableScripts).toMatchObject(scripts);
  });

  it('tolerates malformed package.json', async () => {
    writeTempFile(tmpDir, 'package.json', '{ invalid json }');
    const ctx = await detectProject(tmpDir);
    expect(ctx.availableScripts).toEqual({});
  });
});

describe('detectProject — edge cases', () => {
  it('throws for empty workspacePath', async () => {
    await expect(detectProject('')).rejects.toThrow();
  });

  it('returns empty context for non-existent directory', async () => {
    const ctx = await detectProject('/does/not/exist/nd_test_12345');
    expect(ctx.detectedLanguages).toEqual([]);
    expect(ctx.packageManager).toBe('none');
  });

  it('response always contains rootPath, detectedAt, hasGit, configFiles, availableScripts', async () => {
    const tmpDir2 = makeTempDir();
    try {
      const ctx = await detectProject(tmpDir2);
      expect(typeof ctx.rootPath).toBe('string');
      expect(typeof ctx.detectedAt).toBe('string');
      expect(typeof ctx.hasGit).toBe('boolean');
      expect(Array.isArray(ctx.configFiles)).toBe(true);
      expect(typeof ctx.availableScripts).toBe('object');
    } finally {
      cleanTempDir(tmpDir2);
    }
  });
});
