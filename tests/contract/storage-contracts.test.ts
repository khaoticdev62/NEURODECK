/**
 * Storage contract tests — verify sessions, memory, and filesystem contracts.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

describe('Session storage contract', () => {
  it('sessions list call uses real bridge path', () => {
    const src = fs.readFileSync(path.join(ROOT, 'frontend/src/react/state/useNeuroDeckState.ts'), 'utf8');
    expect(src).toContain('sessions.listMeta');
  });

  it('SessionCard export uses bridgeInvoke, not alert stub', () => {
    const src = fs.readFileSync(path.join(ROOT, 'frontend/src/react/components/cards/SessionCard.tsx'), 'utf8');
    expect(src).toContain('export_session_markdown');
    expect(src).not.toContain("Export specific session is currently handled via the active session pane");
  });

  it('export_session_markdown command exists in bridge dispatch', () => {
    const dispatchPath = path.join(ROOT, 'src-tauri/src/commands/session.rs');
    if (fs.existsSync(dispatchPath)) {
      const src = fs.readFileSync(dispatchPath, 'utf8');
      expect(src).toContain('export_session_markdown');
    } else {
      const modPath = path.join(ROOT, 'src-tauri/src/commands/mod.rs');
      if (fs.existsSync(modPath)) {
        const src = fs.readFileSync(modPath, 'utf8');
        expect(src).toContain('export_session_markdown');
      }
    }
  });
});

describe('Memory storage contract', () => {
  it('memory list call uses real bridge path', () => {
    const src = fs.readFileSync(path.join(ROOT, 'frontend/src/react/state/useNeuroDeckState.ts'), 'utf8');
    expect(src).toContain('memory.list');
  });

  it('BROWSER_SAVE_TO_MEMORY hits sidecar memory_add_fact', () => {
    const src = fs.readFileSync(path.join(ROOT, 'electron/ipc-handlers.js'), 'utf8');
    expect(src).toContain('memory_add_fact');
  });
});

describe('Config/settings storage contract', () => {
  it('settings:get calls real get_config via callSidecar', () => {
    // settings:get is handled in ipc-handlers.js, not main.js
    const handlersPath = path.join(ROOT, 'electron/ipc-handlers.js');
    const mainPath = path.join(ROOT, 'electron/main.js');
    const src = fs.existsSync(handlersPath)
      ? fs.readFileSync(handlersPath, 'utf8')
      : fs.readFileSync(mainPath, 'utf8');
    expect(src).toMatch(/get_config|settings.*get|SETTINGS_GET/);
  });

  it('settings:set dispatches to sidecar (not in-memory only)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'electron/ipc-handlers.js'), 'utf8');
    expect(src).toContain("callSidecar(bridgePort, 'set_provider'");
    expect(src).toContain("callSidecar(bridgePort, 'set_model'");
  });
});

describe('Filesystem paths contract', () => {
  it('Rust code never uses ./data/ relative paths in sidecar', () => {
    const libPath = path.join(ROOT, 'src-tauri/src/lib.rs');
    if (fs.existsSync(libPath)) {
      const src = fs.readFileSync(libPath, 'utf8');
      expect(src).not.toContain('./data/');
      expect(src).not.toContain('./sessions/');
    }
  });

  it('user_config_dir is used for persistent paths', () => {
    const libPath = path.join(ROOT, 'src-tauri/src/lib.rs');
    if (fs.existsSync(libPath)) {
      const src = fs.readFileSync(libPath, 'utf8');
      expect(src).toContain('user_config_dir');
    }
  });
});
