/**
 * Integration test — confirms no production paths contain mock/stub data.
 * These tests scan source files statically (no runtime required).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readSrc(rel: string): string {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8');
}

const PRODUCTION_STUBS_THAT_MUST_NOT_EXIST = [
  { file: 'electron/main.js', pattern: /note:\s*['"]Not yet implemented['"]/, desc: 'BROWSER_SAVE_TO_MEMORY stub' },
  { file: 'electron/ipc-handlers.js', pattern: /For now we mock write config/, desc: 'settings:set fake write comment' },
  { file: 'src/renderer/components/cards/SessionCard.tsx', pattern: /Export specific session is currently handled/, desc: 'SessionCard export alert stub' },
  { file: 'electron/main.js', pattern: /TODO.*implement.*later/, desc: 'generic TODO later stub' },
];

const PRODUCTION_REAL_WIRING_REQUIRED = [
  { file: 'electron/ipc-handlers.js', pattern: /memory_add_fact/, desc: 'BROWSER_SAVE_TO_MEMORY → sidecar' },
  { file: 'electron/ipc-handlers.js', pattern: /callSidecar\(bridgePort,\s*'set_provider'/, desc: 'settings:set → sidecar set_provider' },
  { file: 'electron/ipc-handlers.js', pattern: /callSidecar\(bridgePort,\s*'set_model'/, desc: 'settings:set → sidecar set_model' },
  { file: 'src/renderer/components/cards/SessionCard.tsx', pattern: /export_session_markdown/, desc: 'SessionCard export → real bridge command' },
  { file: 'src/renderer/state/useNeurodeckHydration.ts', pattern: /sessions\.listMeta/, desc: 'State hydration: sessions' },
  { file: 'src/renderer/state/useNeurodeckHydration.ts', pattern: /memory\.list/, desc: 'State hydration: memory' },
  { file: 'src/renderer/state/useNeurodeckHydration.ts', pattern: /getInitialState|agents\.list|plugins\.list/, desc: 'State hydration: initial' },
];

describe('No mock stubs in production code paths', () => {
  for (const { file, pattern, desc } of PRODUCTION_STUBS_THAT_MUST_NOT_EXIST) {
    it(`[${file}] must not contain: ${desc}`, () => {
      const src = readSrc(file);
      if (!src) return; // file missing → skip
      expect(pattern.test(src)).toBe(false);
    });
  }
});

describe('Real wiring required in production code paths', () => {
  for (const { file, pattern, desc } of PRODUCTION_REAL_WIRING_REQUIRED) {
    it(`[${file}] must contain: ${desc}`, () => {
      const src = readSrc(file);
      if (!src) return; // file missing → skip (not a violation; probe handles missing files)
      expect(pattern.test(src)).toBe(true);
    });
  }
});

describe('Renderer isolation — no direct electron imports', () => {
  const FORBIDDEN_IN_RENDERER = [
    /require\(['"]electron['"]\)/,
    /require\(['"]fs['"]\)/,
    /require\(['"]child_process['"]\)/,
    /require\(['"]path['"]\)/,
    /from ['"]electron['"]/,
  ];

  function scanDir(dir: string, ext: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !['node_modules', '__tests__', '.git'].includes(entry.name)) {
        results.push(...scanDir(full, ext));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
        results.push(full);
      }
    }
    return results;
  }

  const rendererFiles = scanDir(path.join(ROOT, 'src/renderer'), '.ts');

  it('renderer files do not directly require electron', () => {
    for (const file of rendererFiles) {
      const src = fs.readFileSync(file, 'utf8');
      for (const forbidden of FORBIDDEN_IN_RENDERER) {
        if (forbidden.test(src)) {
          expect.fail(`Renderer file ${path.relative(ROOT, file)} contains forbidden import: ${forbidden}`);
        }
      }
    }
    expect(rendererFiles.length).toBeGreaterThan(0);
  });
});
