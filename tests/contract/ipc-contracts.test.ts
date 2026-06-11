/**
 * IPC contract tests — verify preload method names match registry and handlers exist.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('IPC channel registry', () => {
  const registry = readFile('electron/ipc-registry.js');

  it('registry file exists and exports IPC_CHANNELS', () => {
    expect(registry).toContain('IPC_CHANNELS');
  });

  it('SETTINGS_SET channel is defined', () => {
    expect(registry).toContain("SETTINGS_SET");
  });

  it('BROWSER_SAVE_TO_MEMORY channel is defined', () => {
    expect(registry).toContain("BROWSER_SAVE_TO_MEMORY");
  });

  it('all LSP channels are present', () => {
    for (const ch of ['lsp:start-server', 'lsp:stop-server', 'lsp:completion', 'lsp:hover', 'lsp:definition', 'lsp:format']) {
      expect(registry).toContain(ch);
    }
  });
});

describe('IPC guards', () => {
  const guards = readFile('electron/ipc-guards.js');

  it('guards file validates sender origin', () => {
    expect(guards).toMatch(/senderFrame|webContents/);
  });

  it('guards file enforces payload size limit', () => {
    expect(guards).toMatch(/MAX_PAYLOAD_SIZE|5 \* 1024 \* 1024/);
  });
});

describe('Main process handlers', () => {
  const main = readFile('electron/main.js');

  it('BROWSER_SAVE_TO_MEMORY is no longer a stub', () => {
    expect(main).not.toContain("Not yet implemented");
    expect(main).toContain('memory_add_fact');
  });

  it('BROWSER_SAVE_TO_MEMORY uses real executeJavaScript', () => {
    expect(main).toContain('executeJavaScript');
  });
});

describe('Settings IPC handler', () => {
  const handlers = readFile('electron/ipc-handlers.js');

  it('settings:set calls real set_provider', () => {
    expect(handlers).toContain("callSidecar(bridgePort, 'set_provider'");
  });

  it('settings:set calls real set_model', () => {
    expect(handlers).toContain("callSidecar(bridgePort, 'set_model'");
  });

  it('settings:set calls real set_gemini_api_key', () => {
    expect(handlers).toContain("callSidecar(bridgePort, 'set_gemini_api_key'");
  });

  it('settings:set returns error for unknown keys (no fake success)', () => {
    expect(handlers).toContain('not configurable via this channel');
  });

  it('settings:set has no mock in-memory mutation comment', () => {
    expect(handlers).not.toContain('For now we mock write config');
  });
});

describe('Preload API surface', () => {
  const preload = readFile('electron/preload.js');

  it('exposes window.neurodeck', () => {
    expect(preload).toContain("exposeInMainWorld('neurodeck'");
  });

  it('exposes window.electronAPI', () => {
    expect(preload).toContain("exposeInMainWorld('electronAPI'");
  });

  it('does not expose raw ipcRenderer', () => {
    expect(preload).not.toContain('ipcRenderer: ipcRenderer');
    expect(preload).not.toContain("exposeInMainWorld('ipcRenderer'");
  });

  it('all requests use makeRequest() with requestId', () => {
    expect(preload).toContain('makeRequest(');
    expect(preload).toContain("requestId: `req-");
  });
});
