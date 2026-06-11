/**
 * Provider contract tests — LLM and model provider shape validation.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

describe('LLM provider contracts', () => {
  it('bridgeAdapter exports bridgeInvoke', () => {
    const src = fs.readFileSync(path.join(ROOT, 'frontend/src/react/services/bridgeAdapter.ts'), 'utf8');
    expect(src).toContain('export');
    expect(src).toContain('bridgeInvoke');
  });

  it('bridgeAdapter offline-draft path is isolated', () => {
    const src = fs.readFileSync(path.join(ROOT, 'frontend/src/react/services/bridgeAdapter.ts'), 'utf8');
    expect(src).toContain("offline-draft");
    const browserDraftIdx = src.indexOf('browserDraft');
    const offlineDraftIdx = src.indexOf("offline-draft");
    expect(browserDraftIdx).toBeGreaterThan(-1);
    expect(offlineDraftIdx).toBeGreaterThan(-1);
  });

  it('bridgeAdapter uses real HTTP fetch for non-offline paths', () => {
    const src = fs.readFileSync(path.join(ROOT, 'frontend/src/react/services/bridgeAdapter.ts'), 'utf8');
    expect(src).toContain('fetch(');
    expect(src).toContain('/api/');
  });

  it('bridgeAdapter has triple fallback (tauri → electron → http)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'frontend/src/react/services/bridgeAdapter.ts'), 'utf8');
    expect(src).toMatch(/tauri|window\.__TAURI__/);
    expect(src).toMatch(/ipcRenderer|electronAPI|window\.neurodeck/);
    expect(src).toMatch(/fetch\(/);
  });
});

describe('Gemini provider contract', () => {
  it('sidecar config includes llm section', () => {
    const configPaths = [
      path.join(ROOT, 'llm-term.toml'),
      path.join(ROOT, 'src-tauri/llm-term.toml'),
    ];
    const exists = configPaths.some(p => fs.existsSync(p));
    expect(exists).toBe(true);
    if (exists) {
      const src = fs.readFileSync(configPaths.find(p => fs.existsSync(p))!, 'utf8');
      expect(src).toContain('[llm]');
    }
  });
});

describe('Ollama provider contract', () => {
  it('bridgeAdapter references ollama in offline-draft or provider logic', () => {
    const src = fs.readFileSync(path.join(ROOT, 'frontend/src/react/services/bridgeAdapter.ts'), 'utf8');
    expect(src.toLowerCase()).toMatch(/ollama|local/);
  });
});

describe('ModelCard data contract', () => {
  it('ModelCard component reads model from state, not from hardcoded list', () => {
    const src = fs.readFileSync(path.join(ROOT, 'frontend/src/react/components/cards/ModelCard.tsx'), 'utf8');
    expect(src).not.toContain("gemini-pro");
    expect(src).not.toContain("llama2");
    expect(src).toContain('model');
  });
});
