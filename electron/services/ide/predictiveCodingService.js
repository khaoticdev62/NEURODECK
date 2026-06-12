'use strict';
/**
 * Predictive Coding Service
 *
 * Ranks prediction results from multiple sources:
 *   1. LSP completions (highest confidence)
 *   2. Diagnostic fix actions
 *   3. Language profile snippets
 *   4. Project command templates
 *
 * Runs in the Electron main process.
 * LSP completions are fetched via the lspManager (already instantiated in main.js).
 */

const { randomUUID } = require('crypto');

const MAX_PREDICTIONS = 20;

/**
 * @param {object} opts
 * @param {string} opts.filePath
 * @param {string} opts.languageId
 * @param {number} opts.cursorLine
 * @param {number} opts.cursorChar
 * @param {number} opts.diagnosticsCount
 * @param {string[]} opts.snippetIds     - IDs of available snippets for this language
 * @param {object[]} opts.commandTemplates - CommandTemplate[] matching project context
 * @param {object[]} opts.lspCompletions  - LSP completion items (already fetched by caller)
 * @returns {object[]} PredictionResult[]
 */
function rankPredictions(opts) {
  const {
    filePath,
    languageId,
    diagnosticsCount = 0,
    snippetIds = [],
    commandTemplates = [],
    lspCompletions = [],
  } = opts;

  const results = [];

  // 1. LSP completions — highest confidence
  for (const item of lspCompletions.slice(0, 10)) {
    results.push({
      id: randomUUID(),
      type: 'lsp_completion',
      label: item.label ?? item.insertText ?? String(item),
      insertText: item.insertText ?? item.label ?? String(item),
      detail: item.detail ?? '',
      source: 'lsp_completion',
      confidence: 0.95,
      languageId,
      safety: 'safe',
    });
  }

  // 2. Diagnostic fix actions — if there are diagnostics, suggest fix action
  if (diagnosticsCount > 0) {
    results.push({
      id: randomUUID(),
      type: 'diagnostic_fix',
      label: `Fix ${diagnosticsCount} diagnostic${diagnosticsCount > 1 ? 's' : ''}`,
      detail: 'Open LSP code actions',
      source: 'diagnostic_fix',
      confidence: 0.85,
      languageId,
      safety: 'safe',
    });
  }

  // 3. Snippets — medium confidence
  for (const snippetId of snippetIds.slice(0, 5)) {
    results.push({
      id: randomUUID(),
      type: 'snippet',
      label: snippetId,
      detail: 'Insert snippet',
      source: 'snippet',
      confidence: 0.6,
      languageId,
      safety: 'safe',
    });
  }

  // 4. Commands — lowest confidence, but most contextually useful
  for (const cmd of commandTemplates.slice(0, 4)) {
    results.push({
      id: randomUUID(),
      type: 'command',
      label: cmd.label,
      detail: cmd.description,
      source: 'command',
      confidence: 0.5,
      languageId,
      safety: cmd.safety,
    });
  }

  // Sort by confidence descending, de-duplicate labels
  const seen = new Set();
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .filter((r) => {
      if (seen.has(r.label)) return false;
      seen.add(r.label);
      return true;
    })
    .slice(0, MAX_PREDICTIONS);
}

/**
 * Build prediction context summary for a file.
 * @param {string} filePath
 * @param {string} languageId
 * @param {number} cursorLine
 * @param {number} cursorChar
 * @param {number} diagnosticsCount
 * @returns {object}
 */
function buildPredictionMeta(filePath, languageId, cursorLine, cursorChar, diagnosticsCount) {
  return {
    filePath,
    languageId,
    cursorLine,
    cursorChar,
    diagnosticsCount,
    computedAt: new Date().toISOString(),
  };
}

module.exports = { rankPredictions, buildPredictionMeta };
