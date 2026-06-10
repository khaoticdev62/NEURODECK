import { TrieIndex } from './trie';
import { fuzzyScore } from './fuzzy';

export interface SuggestionSourceItem {
  id: string;
  label: string;
  type: 'prompt' | 'command' | 'macro' | 'agent' | 'file' | 'slot';
  payload?: unknown;
}

export interface AutocompleteSuggestion extends SuggestionSourceItem {
  score: number;
}

export class AutocompleteEngine {
  private trie = new TrieIndex();
  private items = new Map<string, SuggestionSourceItem>();

  index(items: SuggestionSourceItem[]) {
    for (const item of items) {
      this.items.set(item.id, item);
      this.trie.add(item.label, item.id);
    }
  }

  suggest(query: string, limit = 20): AutocompleteSuggestion[] {
    if (!query.trim()) return [];
    const prefixIds = new Set(this.trie.search(query));
    const suggestions: AutocompleteSuggestion[] = [];
    for (const item of this.items.values()) {
      const score = (prefixIds.has(item.id) ? 35 : 0) + fuzzyScore(query, item.label);
      if (score > 0) suggestions.push({ ...item, score });
    }
    return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  clear() {
    this.trie = new TrieIndex();
    this.items.clear();
  }
}
