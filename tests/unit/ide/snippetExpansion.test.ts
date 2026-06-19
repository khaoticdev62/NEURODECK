/**
 * Unit tests — snippet loading and expansion
 * Verifies that snippets produce valid, non-empty syntax
 * and that placeholder expansion works correctly.
 */
import { describe, it, expect } from 'vitest';
import {
  getSnippetsForLanguage,
  getSnippetById,
  searchSnippets,
  getControllerFriendlySnippets,
  expandSnippetPlaceholders,
} from '../../../src/renderer/shared/ide/predictiveSnippets';

describe('getSnippetsForLanguage', () => {
  it('returns snippets for typescript', () => {
    const snippets = getSnippetsForLanguage('typescript');
    expect(snippets.length).toBeGreaterThanOrEqual(4);
  });

  it('returns snippets for python', () => {
    const snippets = getSnippetsForLanguage('python');
    expect(snippets.length).toBeGreaterThanOrEqual(4);
  });

  it('returns snippets for rust', () => {
    const snippets = getSnippetsForLanguage('rust');
    expect(snippets.length).toBeGreaterThanOrEqual(4);
  });

  it('returns snippets for go', () => {
    const snippets = getSnippetsForLanguage('go');
    expect(snippets.length).toBeGreaterThanOrEqual(4);
  });

  it('returns snippets for lua', () => {
    const snippets = getSnippetsForLanguage('lua');
    expect(snippets.length).toBeGreaterThanOrEqual(4);
  });

  it('returns snippets for bash', () => {
    const snippets = getSnippetsForLanguage('bash');
    expect(snippets.length).toBeGreaterThanOrEqual(4);
  });

  it('returns empty array for unknown language', () => {
    expect(getSnippetsForLanguage('cobol')).toEqual([]);
  });

  it('every snippet has required fields', () => {
    for (const lang of ['typescript', 'python', 'rust', 'go', 'lua', 'bash']) {
      for (const s of getSnippetsForLanguage(lang)) {
        expect(typeof s.id).toBe('string');
        expect(s.id.length).toBeGreaterThan(0);
        expect(typeof s.label).toBe('string');
        expect(typeof s.insertText).toBe('string');
        expect(s.insertText.length).toBeGreaterThan(0);
        expect(Array.isArray(s.placeholders)).toBe(true);
        expect(Array.isArray(s.triggerContexts)).toBe(true);
        expect(typeof s.controllerFriendly).toBe('boolean');
      }
    }
  });

  it('TypeScript function snippet produces syntactically plausible output', () => {
    const snippets = getSnippetsForLanguage('typescript');
    const fnSnippet = snippets.find((s) => s.label.toLowerCase().includes('function') || s.id.includes('function') || s.id.includes('fn'));
    expect(fnSnippet).toBeDefined();
    // insertText should contain `function` keyword or arrow function syntax
    const text = fnSnippet!.insertText;
    expect(text).toMatch(/function|=>/);
  });

  it('Python def snippet produces syntactically plausible output', () => {
    const snippets = getSnippetsForLanguage('python');
    const defSnippet = snippets.find((s) => s.label.toLowerCase().includes('def') || s.id.includes('def') || s.insertText.includes('def '));
    expect(defSnippet).toBeDefined();
    expect(defSnippet!.insertText).toContain('def ');
  });

  it('Rust fn snippet produces syntactically plausible output', () => {
    const snippets = getSnippetsForLanguage('rust');
    const fnSnippet = snippets.find((s) => s.insertText.includes('fn '));
    expect(fnSnippet).toBeDefined();
  });
});

describe('getSnippetById', () => {
  it('retrieves a known typescript snippet by id', () => {
    const snippets = getSnippetsForLanguage('typescript');
    if (snippets.length === 0) return;
    const first = snippets[0];
    const found = getSnippetById(first.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(first.id);
  });

  it('returns undefined for non-existent id', () => {
    expect(getSnippetById('__does_not_exist_xyz')).toBeUndefined();
  });
});

describe('searchSnippets', () => {
  it('returns snippets matching a query prefix', () => {
    const snippets = getSnippetsForLanguage('typescript');
    if (snippets.length === 0) return;

    const firstLabel = snippets[0].label.slice(0, 3).toLowerCase();
    const results = searchSnippets('typescript', firstLabel);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns up to limit results', () => {
    const results = searchSnippets('typescript', '', 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('returns empty array for empty language', () => {
    const results = searchSnippets('cobol', 'fn');
    expect(results).toEqual([]);
  });
});

describe('getControllerFriendlySnippets', () => {
  it('returns only controllerFriendly: true snippets', () => {
    const snippets = getControllerFriendlySnippets('typescript');
    for (const s of snippets) {
      expect(s.controllerFriendly).toBe(true);
    }
  });
});

describe('expandSnippetPlaceholders', () => {
  it('replaces ${1:label} placeholders with provided values', () => {
    const snippet = {
      id: 'test',
      languageId: 'typescript',
      label: 'test',
      description: 'test',
      insertText: 'function ${1:name}(${2:args}) {\n  ${3:body}\n}',
      placeholders: [
        { index: 1, label: 'name', defaultValue: 'myFunc' },
        { index: 2, label: 'args', defaultValue: '' },
        { index: 3, label: 'body', defaultValue: '// TODO' },
      ],
      triggerContexts: [],
      controllerFriendly: true,
      safety: 'safe' as const,
    };

    const expanded = expandSnippetPlaceholders(snippet, { 1: 'doSomething', 2: 'x: number' });
    expect(expanded).toContain('doSomething');
    expect(expanded).toContain('x: number');
    // Unfilled placeholder 3 should use defaultValue
    expect(expanded).toContain('// TODO');
  });

  it('fills unfilled placeholders with defaultValue', () => {
    const snippet = {
      id: 'test2',
      languageId: 'python',
      label: 'def',
      description: 'def',
      insertText: 'def ${1:name}(${2:self}):\n    ${3:pass}',
      placeholders: [
        { index: 1, label: 'name', defaultValue: 'my_func' },
        { index: 2, label: 'self', defaultValue: 'self' },
        { index: 3, label: 'body', defaultValue: 'pass' },
      ],
      triggerContexts: [],
      controllerFriendly: true,
      safety: 'safe' as const,
    };

    const expanded = expandSnippetPlaceholders(snippet, {});
    expect(expanded).toContain('my_func');
    expect(expanded).toContain('self');
    expect(expanded).toContain('pass');
  });
});
