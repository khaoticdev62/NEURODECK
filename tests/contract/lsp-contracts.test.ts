/**
 * LSP contract tests — verify all LSP IPC channels are live and well-formed.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

// IPC request channels (registered in ipc-registry.js)
const LSP_IPC_CHANNELS = [
  'lsp:start-server',
  'lsp:stop-server',
  'lsp:completion',
  'lsp:hover',
  'lsp:definition',
  'lsp:format',
];
// lsp:diagnostics is a WebSocket push event (sidecar → frontend), not an IPC channel

describe('LSP channel definitions', () => {
  it('all LSP IPC channels are defined in registry', () => {
    const registry = fs.readFileSync(path.join(ROOT, 'electron/ipc-registry.js'), 'utf8');
    for (const ch of LSP_IPC_CHANNELS) {
      expect(registry).toContain(ch);
    }
  });
});

describe('LSP manager wiring', () => {
  const managerPath = path.join(ROOT, 'electron/services/lsp/lsp-manager.js');

  it('LSP manager file exists', () => {
    expect(fs.existsSync(managerPath)).toBe(true);
  });

  it('LSP manager handles start-server', () => {
    if (!fs.existsSync(managerPath)) return;
    const src = fs.readFileSync(managerPath, 'utf8');
    expect(src).toMatch(/start.*server|startServer/i);
  });

  it('LSP manager handles completion', () => {
    if (!fs.existsSync(managerPath)) return;
    const src = fs.readFileSync(managerPath, 'utf8');
    expect(src).toMatch(/completion/i);
  });

  it('LSP manager handles hover', () => {
    if (!fs.existsSync(managerPath)) return;
    const src = fs.readFileSync(managerPath, 'utf8');
    expect(src).toMatch(/hover/i);
  });

  it('LSP manager does not use fake/stub responses', () => {
    if (!fs.existsSync(managerPath)) return;
    const src = fs.readFileSync(managerPath, 'utf8');
    expect(src).not.toContain("items: []");
    expect(src).not.toContain("Not yet implemented");
  });
});

describe('LSP IPC handlers in main.js', () => {
  it('main.js delegates lsp channels to LspManager (not stub)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'electron/main.js'), 'utf8');
    expect(src).toMatch(/lspManager|LspManager|lsp-manager/i);
    expect(src).not.toContain("lsp:start-server.*Not yet");
  });
});

describe('Preload LSP API', () => {
  it('preload exposes lsp namespace', () => {
    const src = fs.readFileSync(path.join(ROOT, 'electron/preload.js'), 'utf8');
    expect(src).toContain('lsp');
  });
});
