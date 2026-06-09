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

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await neurodeckApi.docs.getIndexedDocs();
      setDocs(res.docs || []);
    } catch (_) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await neurodeckApi.docs.searchDocs(query);
      setResults(res.results || []);
    } catch (_) { /* ignore */ }
    setLoading(false);
  };

  const indexDir = async () => {
    if (!indexPath.trim()) return;
    setLoading(true);
    try {
      await neurodeckApi.docs.indexDirectory(indexPath.trim());
      setIndexPath('');
      await loadDocs();
    } catch (_) { /* ignore */ }
    setLoading(false);
  };

  const clear = async () => {
    setLoading(true);
    try {
      await neurodeckApi.docs.clearIndex();
      setDocs([]);
      setResults([]);
    } catch (_) { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neuro/20 bg-neuro/10">
          <BookOpen className="h-5 w-5 text-neuro" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-50">Knowledge Base</h2>
          <p className="text-xs text-slate-500">Indexed documentation with semantic search</p>
        </div>
        <button type="button" onClick={loadDocs} disabled={loading} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/[0.04] hover:text-slate-100">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Search indexed docs..."
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none"
          />
          <button type="button" onClick={search} className="text-xs font-medium text-neuro hover:text-neuro/80">Search</button>
        </div>
        <button type="button" onClick={clear} className="rounded-lg border border-danger/30 bg-danger/10 p-2 text-danger hover:bg-danger/20">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
          <FolderOpen className="h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={indexPath}
            onChange={(e) => setIndexPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && indexDir()}
            placeholder="Path to index..."
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none"
          />
        </div>
        <button type="button" onClick={indexDir} className="rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success hover:bg-success/20">
          Index
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-64 flex-col overflow-auto rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Indexed Docs ({docs.length})</span>
          <div className="mt-2 space-y-1">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <span className="truncate">{doc.title || doc.path}</span>
              </div>
            ))}
            {!docs.length && <p className="py-4 text-center text-xs text-slate-600">No documents indexed</p>}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">{r.title}</span>
                    <span className="text-[10px] text-slate-600">{(r.score * 100).toFixed(1)}%</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{r.snippet}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-slate-600">
              <Search className="h-8 w-8 mb-2" />
              <p className="text-sm">Search indexed documents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
