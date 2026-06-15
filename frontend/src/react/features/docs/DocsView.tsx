import { useCallback, useEffect, useState } from "react";
import { BookOpen, Search, FolderOpen, Trash2, RefreshCw, FileText } from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { IconButton } from "../../components/primitives/IconButton";
import { LoadingState } from "../../components/primitives/LoadingState";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import { TextInput } from "../../components/primitives/TextInput";
import { neurodeckApi } from "../../services/bridgeAdapter";

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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexPath, setIndexPath] = useState("");
  const [status, setStatus] = useState("Load indexed docs or add a folder to begin.");
  const [error, setError] = useState("");

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setError("");
    setStatus("Refreshing indexed docs...");
    try {
      const res = await neurodeckApi.docs.getIndexedDocs();
      const nextDocs = res.docs || [];
      setDocs(nextDocs);
      setStatus(
        nextDocs.length > 0
          ? `Loaded ${nextDocs.length} indexed doc${nextDocs.length === 1 ? "" : "s"}.`
          : "No documents are indexed yet. Use Index to add a folder."
      );
      return nextDocs;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load indexed docs.");
      setStatus("Refresh failed.");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const currentDocs = await loadDocs();
      if (!mounted) return;

      try {
        const defaultPath = await neurodeckApi.docs.getDefaultPath();
        if (!mounted) return;
        if (defaultPath.exists) {
          setIndexPath(defaultPath.path);
          if (currentDocs.length === 0) {
            setStatus(`Indexing default docs folder: ${defaultPath.path}...`);
            setLoading(true);
            try {
              await neurodeckApi.docs.indexDirectory(defaultPath.path);
              await loadDocs();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to index default docs folder.");
              setStatus("Default docs folder index failed.");
            } finally {
              if (mounted) setLoading(false);
            }
          }
        }
      } catch (_) {
        // Default folder discovery is optional; leave the input empty
      }
    }
    void init();
    return () => {
      mounted = false;
    };
  }, [loadDocs]);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setStatus(`Searching for “${query.trim()}”...`);
    try {
      const res = await neurodeckApi.docs.searchDocs(query);
      const nextResults = res.results || [];
      setResults(nextResults);
      setStatus(
        nextResults.length > 0
          ? `Found ${nextResults.length} result${nextResults.length === 1 ? "" : "s"}.`
          : "No matches found for that query."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search indexed docs.");
      setStatus("Search failed.");
    } finally {
      setLoading(false);
    }
  };

  const indexDir = async () => {
    if (!indexPath.trim()) return;
    setLoading(true);
    setError("");
    setStatus(`Indexing ${indexPath.trim()}...`);
    try {
      await neurodeckApi.docs.indexDirectory(indexPath.trim());
      setIndexPath("");
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start indexing.");
      setStatus("Index request failed.");
      setLoading(false);
    }
  };

  const clear = async () => {
    setLoading(true);
    setError("");
    setStatus("Clearing document index...");
    try {
      await neurodeckApi.docs.clearIndex();
      setDocs([]);
      setResults([]);
      setStatus("Document index cleared.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear the index.");
      setStatus("Clear failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="docs-container flex h-full flex-col">
      <Panel
        eyebrow="Docs"
        title="Knowledge Base"
        className="flex h-full flex-col overflow-hidden"
        action={
          <IconButton
            variant="subtle"
            size="md"
            aria-label="Reload indexed docs"
            onClick={() => void loadDocs()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          </IconButton>
        }
      >
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-secondary/40 px-3 py-2 text-xs">
            <StatusChip tone={error ? "error" : loading ? "info" : "success"} size="sm">
              {error ? "Error" : loading ? "Working" : "Ready"}
            </StatusChip>
            <span className="text-text-secondary">{status}</span>
            {error ? <p className="text-accent-error">{error}</p> : null}
          </div>

          <div className="docs-search-shell flex gap-2">
            <TextInput
              id="docs-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search indexed docs..."
              aria-label="Search indexed docs"
              className="flex-1"
            />
            <Button variant="primary" size="sm" icon={Search} onClick={search}>
              Search
            </Button>
            <Button variant="danger" size="sm" icon={Trash2} onClick={clear}>
              Clear
            </Button>
          </div>

          <div className="flex gap-2">
            <TextInput
              id="docs-index-path"
              value={indexPath}
              onChange={(e) => setIndexPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && indexDir()}
              placeholder="Path to index..."
              aria-label="Directory path to index"
              className="flex-1"
            />
            <Button variant="success" size="sm" icon={FolderOpen} onClick={indexDir}>
              Index
            </Button>
          </div>

          <div className="flex min-h-0 flex-1 gap-4">
            <Panel
              eyebrow="Indexed"
              title={`Docs (${docs.length})`}
              className="flex w-64 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                <div className="space-y-1">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-text-secondary transition duration-fast hover:bg-surface-tertiary/30"
                    >
                      <FileText
                        className="h-3.5 w-3.5 shrink-0 text-text-muted"
                        aria-hidden="true"
                      />
                      <span className="truncate">{doc.title || doc.path}</span>
                    </div>
                  ))}
                </div>
                {!docs.length && !loading && (
                  <EmptyState
                    compact
                    icon={BookOpen}
                    title="No documents indexed"
                    description="Add a folder path above to start indexing your documentation."
                  />
                )}
                {!docs.length && loading && <LoadingState label="Refreshing index…" size="sm" />}
              </div>
            </Panel>

            <Panel className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                {loading && !results.length ? (
                  <LoadingState label="Loading docs…" />
                ) : results.length > 0 ? (
                  <div className="space-y-3">
                    {results.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-border-subtle bg-surface-secondary/40 p-3 transition duration-fast hover:bg-surface-tertiary/30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-text-primary">{r.title}</span>
                          <Badge tone="accent" size="sm">
                            {(r.score * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                          {r.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    className="h-full"
                    icon={Search}
                    title="Search indexed documents"
                    description="Enter a query above to search the local documentation index."
                  />
                )}
              </div>
            </Panel>
          </div>
        </div>
      </Panel>
    </div>
  );
}
