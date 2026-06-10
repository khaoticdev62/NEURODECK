export class TrieNode {
  children = new Map<string, TrieNode>();
  ids = new Set<string>();
}

export class TrieIndex {
  private root = new TrieNode();

  add(label: string, id: string) {
    let node = this.root;
    for (const ch of label.toLowerCase()) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch)!;
      node.ids.add(id);
    }
  }

  search(prefix: string): string[] {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      const next = node.children.get(ch);
      if (!next) return [];
      node = next;
    }
    return [...node.ids];
  }
}
