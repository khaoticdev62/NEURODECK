/**
 * Unit tests — predictive coding service ranking
 * Verifies the confidence-based ordering: LSP > diagnostic_fix > snippet > command
 */
import { describe, it, expect } from 'vitest';

const { rankPredictions } = require('../../../electron/services/ide/predictiveCodingService');

const BASE_OPTS = {
  filePath: '/workspace/src/main.ts',
  languageId: 'typescript',
  cursorLine: 10,
  cursorChar: 4,
  diagnosticsCount: 0,
  snippetIds: [],
  commandTemplates: [],
  lspCompletions: [],
};

describe('rankPredictions — ordering', () => {
  it('returns an array', () => {
    const results = rankPredictions(BASE_OPTS);
    expect(Array.isArray(results)).toBe(true);
  });

  it('returns empty array when all sources are empty', () => {
    const results = rankPredictions(BASE_OPTS);
    expect(results).toEqual([]);
  });

  it('LSP completions come before snippets', () => {
    const results = rankPredictions({
      ...BASE_OPTS,
      lspCompletions: [{ label: 'console.log', insertText: 'console.log($1)' }],
      snippetIds: ['ts-function'],
    });
    const lspIdx = results.findIndex((r: any) => r.source === 'lsp_completion');
    const snippetIdx = results.findIndex((r: any) => r.source === 'snippet');
    expect(lspIdx).toBeLessThan(snippetIdx);
  });

  it('diagnostic fixes come before snippets', () => {
    const results = rankPredictions({
      ...BASE_OPTS,
      diagnosticsCount: 2,
      snippetIds: ['ts-function'],
    });
    const fixIdx = results.findIndex((r: any) => r.source === 'diagnostic_fix');
    const snippetIdx = results.findIndex((r: any) => r.source === 'snippet');
    expect(fixIdx).toBeLessThan(snippetIdx);
  });

  it('snippets come before commands', () => {
    const results = rankPredictions({
      ...BASE_OPTS,
      snippetIds: ['ts-function'],
      commandTemplates: [{ id: 'ts-run', label: 'Run', command: 'node', args: ['dist/main.js'], safety: 'safe', cwdStrategy: 'workspace', description: 'Run built output' }],
    });
    const snippetIdx = results.findIndex((r: any) => r.source === 'snippet');
    const cmdIdx = results.findIndex((r: any) => r.source === 'command');
    expect(snippetIdx).toBeLessThan(cmdIdx);
  });

  it('LSP completions have confidence 0.95', () => {
    const results = rankPredictions({
      ...BASE_OPTS,
      lspCompletions: [{ label: 'map', insertText: 'map' }],
    });
    const lsp = results.find((r: any) => r.source === 'lsp_completion');
    expect(lsp?.confidence).toBe(0.95);
  });

  it('diagnostic fix has confidence 0.85', () => {
    const results = rankPredictions({
      ...BASE_OPTS,
      diagnosticsCount: 1,
    });
    const fix = results.find((r: any) => r.source === 'diagnostic_fix');
    expect(fix?.confidence).toBe(0.85);
  });

  it('snippets have confidence 0.6', () => {
    const results = rankPredictions({
      ...BASE_OPTS,
      snippetIds: ['ts-function'],
    });
    const snippet = results.find((r: any) => r.source === 'snippet');
    expect(snippet?.confidence).toBe(0.6);
  });

  it('commands have confidence 0.5', () => {
    const results = rankPredictions({
      ...BASE_OPTS,
      commandTemplates: [{ id: 'ts-build', label: 'Build', command: 'npx', args: ['tsc'], safety: 'safe', cwdStrategy: 'workspace', description: 'Compile TypeScript' }],
    });
    const cmd = results.find((r: any) => r.source === 'command');
    expect(cmd?.confidence).toBe(0.5);
  });
});

describe('rankPredictions — caps and deduplication', () => {
  it('caps results at 20', () => {
    const lspCompletions = Array.from({ length: 30 }, (_, i) => ({
      label: `item${i}`,
      insertText: `item${i}`,
    }));
    const results = rankPredictions({ ...BASE_OPTS, lspCompletions });
    expect(results.length).toBeLessThanOrEqual(20);
  });

  it('deduplicates results by label', () => {
    const results = rankPredictions({
      ...BASE_OPTS,
      lspCompletions: [
        { label: 'duplicate', insertText: 'duplicate' },
        { label: 'duplicate', insertText: 'duplicate' },
      ],
    });
    const labels = results.map((r: any) => r.label);
    const unique = new Set(labels);
    expect(labels.length).toBe(unique.size);
  });
});

describe('rankPredictions — result shape', () => {
  it('every result has required fields', () => {
    const results = rankPredictions({
      ...BASE_OPTS,
      lspCompletions: [{ label: 'map', insertText: 'map()' }],
      diagnosticsCount: 1,
      snippetIds: ['ts-fn'],
      commandTemplates: [{ id: 'build', label: 'Build', command: 'tsc', args: [], safety: 'safe', cwdStrategy: 'workspace', description: '' }],
    });

    for (const r of results) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.label).toBe('string');
      expect(typeof r.source).toBe('string');
      expect(typeof r.confidence).toBe('number');
      expect(typeof r.languageId).toBe('string');
    }
  });

  it('does not produce results with empty labels', () => {
    const results = rankPredictions({
      ...BASE_OPTS,
      lspCompletions: [{ label: 'valid', insertText: 'valid' }],
    });
    for (const r of results) {
      expect(r.label.length).toBeGreaterThan(0);
    }
  });
});
