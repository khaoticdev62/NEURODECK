import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Search, FolderOpen, Trash2, RefreshCw, FileText } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';

interface DocItem {
  id: string;
  title: string;
  path: string;
}

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
}

export function DocsView() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexPath, setIndexPath] = useState('');
  const [status, setStatus] = useState('Load indexed docs or add a folder to begin.');
  const [error, setError] = useState('');

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setError('');
    setStatus('Refreshing indexed docs...');
    try {
      const res = await neurodeckApi.docs.getIndexedDocs();
      const nextDocs = res.docs || [];
      setDocs(nextDocs);
      setStatus(
        nextDocs.length > 0
          ? `Loaded ${nextDocs.length} indexed doc${nextDocs.length === 1 ? '' : 's'}.`
          : 'No documents are indexed yet. Use Index to add a folder.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load indexed docs.');
      setStatus('Refresh failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setStatus(`Searching for “${query.trim()}”...`);
    try {
      const res = await neurodeckApi.docs.searchDocs(query);
      const nextResults = res.results || [];
      setResults(nextResults);
      setStatus(
        nextResults.length > 0
          ? `Found ${nextResults.length} result${nextResults.length === 1 ? '' : 's'}.`
          : 'No matches found for that query.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search indexed docs.');
      setStatus('Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const indexDir = async () => {
    if (!indexPath.trim()) return;
    setLoading(true);
    setError('');
    setStatus(`Indexing ${indexPath.trim()}...`);
    try {
      await neurodeckApi.docs.indexDirectory(indexPath.trim());
      setIndexPath('');
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start indexing.');
      setStatus('Index request failed.');
      setLoading(false);
    }
  };

  const clear = async () => {
    setLoading(true);
    setError('');
    setStatus('Clearing document index...');
    try {
      await neurodeckApi.docs.clearIndex();
      setDocs([]);
      setResults([]);
      setStatus('Document index cleared.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear the index.');
      setStatus('Clear failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="docs-container flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <BookOpen className="h-5 w-5 text-nd-accent" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="docs-kicker text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Docs</div>
          <h2 className="text-lg font-semibold text-nd-text">Knowledge Base</h2>
          <p className="text-xs text-nd-text-muted">Indexed documentation with semantic search</p>
        </div>
        <button type="button" aria-label="Reload indexed docs" onClick={loadDocs} disabled={loading} className="rounded-lg border border-nd-text-muted/15 p-2 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-xs text-nd-text-muted">
        <div className="flex items-center justify-between gap-3">
          <span>{status}</span>
          {loading && <span className="shrink-0 text-nd-accent">Working…</span>}
        </div>
        {error ? <p className="mt-1 text-nd-danger">{error}</p> : null}
      </div>

      <div className="docs-search-shell mb-4 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2">
          <Search className="h-4 w-4 text-nd-text-muted" aria-hidden="true" />
          <input
            id="docs-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search indexed docs..."
            aria-label="Search indexed docs"
            className="flex-1 bg-transparent text-sm text-nd-text outline-none"
          />
          <button type="button" onClick={search} className="text-xs font-medium text-nd-accent hover:text-nd-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded px-1">Search</button>
        </div>
        <button type="button" aria-label="Clear all docs" onClick={clear} className="rounded-lg border border-nd-danger/30 bg-nd-danger/10 p-2 text-nd-danger hover:bg-nd-danger/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2">
          <FolderOpen className="h-4 w-4 text-nd-text-muted" aria-hidden="true" />
          <input
            type="text"
            value={indexPath}
            onChange={(e) => setIndexPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && indexDir()}
            placeholder="Path to index..."
            aria-label="Directory path to index"
            className="flex-1 bg-transparent text-sm text-nd-text outline-none"
          />
        </div>
        <button type="button" onClick={indexDir} className="rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-success/40">
          Index
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-64 flex-col overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-nd-text-muted">Indexed Docs ({docs.length})</span>
          <div className="mt-2 space-y-1">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-nd-text/80">
                <FileText className="h-3.5 w-3.5 text-nd-text-muted" aria-hidden="true" />
                <span className="truncate">{doc.title || doc.path}</span>
              </div>
            ))}
            {!docs.length && !loading && <p className="py-4 text-center text-xs text-nd-text-muted/70">No documents indexed</p>}
            {!docs.length && loading && <p className="py-4 text-center text-xs text-nd-text-muted/70">Refreshing index…</p>}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
          {loading && !results.length ? (
            <div className="flex flex-1 flex-col items-center justify-center text-nd-text-muted/70">
              <RefreshCw className="mb-2 h-8 w-8 animate-spin" />
              <p className="text-sm">Loading docs…</p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              {results.map((r) => (
                <div key={r.id} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-nd-text/90">{r.title}</span>
                    <span className="text-[10px] text-nd-text-muted/70">{(r.score * 100).toFixed(1)}%</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-nd-text-muted">{r.snippet}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-nd-text-muted/70">
              <Search className="h-8 w-8 mb-2" />
              <p className="text-sm">Search indexed documents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
