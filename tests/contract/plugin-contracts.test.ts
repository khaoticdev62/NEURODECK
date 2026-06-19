/**
 * Plugin contract tests — verify plugin lifecycle and Lua integration contracts.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

describe('Plugin registry contract', () => {
  it('plugins directory exists', () => {
    expect(fs.existsSync(path.join(ROOT, 'plugins'))).toBe(true);
  });

  it('plugins list command exists in sidecar', () => {
    const modPath = path.join(ROOT, 'src-tauri/src/commands/mod.rs');
    if (fs.existsSync(modPath)) {
      const src = fs.readFileSync(modPath, 'utf8');
      expect(src).toContain('list_plugins');
    }
  });

  it('plugin_mgr reload_plugins_bridge does not take AppHandle as parameter', () => {
    const pluginPath = path.join(ROOT, 'src-tauri/src/plugin_mgr.rs');
    if (!fs.existsSync(pluginPath)) return;
    const src = fs.readFileSync(pluginPath, 'utf8');
    expect(src).toContain('reload_plugins_bridge');
    // Extract just the function signature, not the whole file
    const fnMatch = src.match(/pub async fn reload_plugins_bridge\([^{]+\)/);
    if (fnMatch) {
      expect(fnMatch[0]).not.toContain('AppHandle');
    }
  });
});

describe('Lua plugin system contract', () => {
  it('lua.rs LuaEngine constructor does not use AppHandle', () => {
    const luaPath = path.join(ROOT, 'src-tauri/src/lua.rs');
    if (!fs.existsSync(luaPath)) return;
    const src = fs.readFileSync(luaPath, 'utf8');
    // Must have a new() constructor
    expect(src).toMatch(/fn new/);
    // Constructor must not accept AppHandle — check new() signature specifically
    const newFnMatch = src.match(/fn new\s*\([^{]+\)/);
    if (newFnMatch) {
      expect(newFnMatch[0]).not.toContain('AppHandle');
    }
    // Must use Arc (standard Rust Arc pattern for AppState sharing)
    expect(src).toContain('Arc');
  });

  it('Lua globals include all required exports', () => {
    const luaPath = path.join(ROOT, 'src-tauri/src/lua.rs');
    if (fs.existsSync(luaPath)) {
      const src = fs.readFileSync(luaPath, 'utf8');
      const globals = ['print', 'execute', 'registerCommand', 'registerHook', 'setPersona', 'sendPrompt'];
      for (const g of globals) {
        expect(src).toContain(g);
      }
    }
  });

  it('BMAD personas are registered in Lua plugin', () => {
    const bmadPath = path.join(ROOT, 'plugins/bmad.lua');
    if (fs.existsSync(bmadPath)) {
      const src = fs.readFileSync(bmadPath, 'utf8');
      expect(src).toContain('setPersona');
    }
  });
});

describe('Plugin security contract', () => {
  it('Lua AI shell-code execution has confirm gate in frontend', () => {
    const chatJsPath = path.join(ROOT, 'src/renderer/chat.js');
    const mainJsPath = path.join(ROOT, 'src/renderer/main.js');
    const legacyPath = path.join(ROOT, 'frontend/main.js');

    const found = [chatJsPath, mainJsPath, legacyPath].filter(p => fs.existsSync(p));
    if (found.length === 0) return;

    const src = fs.readFileSync(found[0], 'utf8');
    expect(src).toMatch(/confirm|window\.confirm/);
  });
});
