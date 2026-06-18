/**
 * Predictive snippet utilities — loads and indexes snippets from language profiles.
 */
import type { PredictiveSnippet } from "../contracts/ide.contracts";
import { getAllProfiles } from "./languageProfiles";

let _snippetIndex: Map<string, PredictiveSnippet[]> | null = null;

function buildIndex(): Map<string, PredictiveSnippet[]> {
  const index = new Map<string, PredictiveSnippet[]>();
  for (const profile of getAllProfiles()) {
    const existing = index.get(profile.id) ?? [];
    existing.push(...profile.snippets);
    index.set(profile.id, existing);
  }
  return index;
}

function getIndex(): Map<string, PredictiveSnippet[]> {
  if (!_snippetIndex) _snippetIndex = buildIndex();
  return _snippetIndex;
}

export function getSnippetsForLanguage(languageId: string): PredictiveSnippet[] {
  return getIndex().get(languageId) ?? [];
}

export function getSnippetById(id: string): PredictiveSnippet | undefined {
  for (const snippets of getIndex().values()) {
    const found = snippets.find((s) => s.id === id);
    if (found) return found;
  }
  return undefined;
}

export function searchSnippets(languageId: string, query: string, limit = 5): PredictiveSnippet[] {
  const all = getSnippetsForLanguage(languageId);
  if (!query) return all.slice(0, limit);

  const lower = query.toLowerCase();
  const scored = all
    .map((s) => {
      let score = 0;
      if (s.label.toLowerCase().startsWith(lower)) score += 3;
      else if (s.label.toLowerCase().includes(lower)) score += 2;
      else if (s.description.toLowerCase().includes(lower)) score += 1;
      else if (s.triggerContexts.some((c) => c.includes(lower))) score += 1;
      return { snippet: s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.snippet);
}

export function getControllerFriendlySnippets(languageId: string): PredictiveSnippet[] {
  return getSnippetsForLanguage(languageId).filter((s) => s.controllerFriendly);
}

export function expandSnippetPlaceholders(
  snippet: PredictiveSnippet,
  values: Record<number, string>
): string {
  let text = snippet.insertText;
  for (const [indexStr, value] of Object.entries(values)) {
    const idx = Number(indexStr);
    // Replace ${N:label} and ${N} patterns
    text = text.replace(new RegExp(`\\$\\{${idx}:[^}]*\\}`, "g"), value);
    text = text.replace(new RegExp(`\\$\\{${idx}\\}`, "g"), value);
  }
  // Fill remaining placeholders with default values
  for (const placeholder of snippet.placeholders) {
    if (!(placeholder.index in values)) {
      const defaultVal = placeholder.defaultValue ?? "";
      text = text.replace(new RegExp(`\\$\\{${placeholder.index}:[^}]*\\}`, "g"), defaultVal);
      text = text.replace(new RegExp(`\\$\\{${placeholder.index}\\}`, "g"), defaultVal);
    }
  }
  return text;
}
