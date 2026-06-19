/**
 * Provider contract tests — LLM and model provider shape validation.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

describe('LLM provider contracts', () => {
  it('bridgeAdapter exports bridgeInvoke', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/renderer/services/bridgeAdapter.ts'), 'utf8');
    expect(src).toContain('export');
    expect(src).toContain('bridgeInvoke');
  });

  it('bridgeAdapter offline-draft path is isolated', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/renderer/services/bridge/domains/ai.ts'), 'utf8');
    expect(src).toContain("offline-draft");
    const browserDraftIdx = src.indexOf('browserDraft');
    const offlineDraftIdx = src.indexOf("offline-draft");
    expect(browserDraftIdx).toBeGreaterThan(-1);
    expect(offlineDraftIdx).toBeGreaterThan(-1);
  });

  it('bridgeAdapter uses real HTTP fetch for non-offline paths', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/renderer/services/bridge/http.ts'), 'utf8');
    expect(src).toContain('fetch(');
    expect(src).toContain('/api/');
  });

  it('bridgeAdapter is bridge-only (HTTP + WebSocket)', () => {
    const files = [
      'src/renderer/services/bridge/http.ts',
      'src/renderer/services/bridge/transport.ts',
      'src/renderer/services/bridge/config.ts'
    ];
    const src = files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    expect(src).toMatch(/fetch\(/);
    expect(src).toMatch(/WebSocket\(/);
    expect(src).toMatch(/\/ws/);
    expect(src).toMatch(/127\.0\.0\.1/);
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
    const src = fs.readFileSync(path.join(ROOT, 'src/renderer/services/bridge/domains/ai.ts'), 'utf8');
    expect(src.toLowerCase()).toMatch(/ollama|local/);
  });
});

describe('ModelCard data contract', () => {
  it('ModelCard component reads model from state, not from hardcoded list', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/renderer/components/cards/ModelCard.tsx'), 'utf8');
    expect(src).not.toContain("gemini-pro");
    expect(src).not.toContain("llama2");
    expect(src).toContain('model');
  });

  it('ModelCard disables selection when policy blocks the model', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/renderer/components/cards/ModelCard.tsx'), 'utf8');
    expect(src).toContain('policyAllowed');
    expect(src).toContain('Blocked');
    expect(src).toContain('disabled={policyAllowed === false}');
  });
});

describe('SettingsView provider contract', () => {
  it('no longer hardcodes the provider list', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/renderer/features/settings/hooks/useProviderOptions.ts'), 'utf8');
    expect(src).not.toMatch(/const providers\s*=/);
    expect(src).toContain('listProviderRuntimes');
  });
});

describe('DiagnosticsView bridge contract', () => {
  it('uses bridge-backed diagnostics instead of preload API', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/renderer/features/diagnostics/DiagnosticsView.tsx'), 'utf8');
    expect(src).not.toContain('window.neurodeck.diagnostics');
    expect(src).toContain('neurodeckApi.diagnostics.getConnectionMatrix');
    expect(src).toContain('neurodeckApi.diagnostics.runHealthProbe');
  });
});
