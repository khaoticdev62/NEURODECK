/**
 * Integration tests — no mock data in production IDE paths
 * Scans production IDE source files for hardcoded fake patterns.
 * Test files and fixture files are excluded.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const PRODUCTION_DIRS = [
  path.resolve('src/renderer/features/ide'),
  path.resolve('electron/services/ide'),
  path.resolve('src/renderer/shared/ide'),
  path.resolve('src/renderer/shared/contracts'),
];

const EXCLUDE_PATTERNS = [
  /\/__tests__\//,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\/fixtures\//,
  /\/mocks\//,
];

const FORBIDDEN_PATTERNS = [
  { pattern: /MOCK_COMPLETION|mockCompletion|fakeCompletion/i, description: 'fake completion array' },
  { pattern: /hardcoded.*lsp|lsp.*hardcoded/i, description: 'hardcoded LSP reference' },
  { pattern: /FAKE_DIAGNOSTIC|fakeDiagnostic/i, description: 'fake diagnostic' },
  { pattern: /const completions = \[/i, description: 'hardcoded completions array' },
  { pattern: /\/\/ fake|\/\/ mock data|\/\/ TODO: remove mock/i, description: 'mock data comment' },
  { pattern: /\{\s*label:\s*["']fake/i, description: "fake-labeled completion item" },
];

function collectFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (/\.[jt]sx?$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function isExcluded(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some((p) => p.test(filePath.replace(/\\/g, '/')));
}

describe('No mock IDE data in production paths', () => {
  const files = PRODUCTION_DIRS.flatMap(collectFiles).filter((f) => !isExcluded(f));

  it('finds production IDE source files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { pattern, description } of FORBIDDEN_PATTERNS) {
    it(`no file contains "${description}"`, () => {
      const violations: string[] = [];
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        if (pattern.test(content)) {
          violations.push(path.relative(process.cwd(), file));
        }
      }
      if (violations.length > 0) {
        const msg = `Found forbidden pattern (${description}) in:\n  ${violations.join('\n  ')}`;
        expect.fail(msg);
      }
    });
  }

  it('predictiveCodingService uses no hardcoded completion labels', () => {
    const servicePath = path.resolve('electron/services/ide/predictiveCodingService.js');
    if (!fs.existsSync(servicePath)) return;
    const content = fs.readFileSync(servicePath, 'utf8');
    // Should not contain hardcoded string arrays that look like LSP label lists
    expect(content).not.toMatch(/const fakeItems|const mockItems|const hardcodedItems/i);
  });

  it('IDEView does not import from __mocks__', () => {
    const viewPath = path.resolve('src/renderer/features/ide/IDEView.tsx');
    if (!fs.existsSync(viewPath)) return;
    const content = fs.readFileSync(viewPath, 'utf8');
    expect(content).not.toMatch(/from ['"].*__mocks__/);
  });

  it('language profile service returns profiles from JSON assets, not inline strings', () => {
    const profilesPath = path.resolve('src/renderer/shared/ide/languageProfiles.ts');
    if (!fs.existsSync(profilesPath)) return;
    const content = fs.readFileSync(profilesPath, 'utf8');
    // Must import from JSON files, not define profiles inline
    expect(content).toMatch(/from ['"].*language-profiles\//);
  });
});
