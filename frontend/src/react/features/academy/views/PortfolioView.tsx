import { useState, useEffect, useCallback } from 'react';
import { Download, FolderOpen } from 'lucide-react';
import { LoadingState } from '../../../components/primitives/LoadingState';
import { EmptyState } from '../../../components/primitives/EmptyState';
import { ErrorState } from '../../../components/primitives/ErrorState';
import { Panel } from '../../../components/primitives/Panel';
import { Badge } from '../../../components/primitives/Badge';
import type { AcademyPortfolioEntry } from '../../../services/bridgeAdapter';
import { neurodeckApi } from '../../../services/bridgeAdapter';

type PortfolioEntry = AcademyPortfolioEntry;

export function PortfolioView() {
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await neurodeckApi.academy.listPortfolio();
      setEntries(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function exportMarkdown() {
    if (entries.length === 0) return;
    const lines: string[] = [
      '# NeuroDeck SOC Portfolio\n',
      `Generated: ${new Date().toLocaleString()}\n`,
      '---\n',
    ];
    for (const entry of entries) {
      lines.push(`## ${entry.labTitle}`);
      lines.push(`\n**Date:** ${new Date(entry.timestamp).toLocaleDateString()}`);
      if (entry.summary) {
        lines.push(`\n**Summary:** ${entry.summary}`);
      }
      if (entry.findings.length > 0) {
        lines.push('\n**Findings:**');
        entry.findings.forEach((f) => lines.push(`- ${f}`));
      }
      if (entry.commandsUsed.length > 0) {
        lines.push('\n**Commands Used:**');
        lines.push('```');
        entry.commandsUsed.forEach((c) => lines.push(c));
        lines.push('```');
      }
      if (entry.mitreMappings.length > 0) {
        lines.push(`\n**MITRE ATT&CK:** ${entry.mitreMappings.join(', ')}`);
      }
      if (entry.skillsEarned.length > 0) {
        lines.push(`\n**Skills:** ${entry.skillsEarned.join(', ')}`);
      }
      lines.push('\n---\n');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soc-portfolio-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <LoadingState label="Loading portfolio…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <Panel
        eyebrow="Portfolio"
        title="Investigation Evidence"
        action={entries.length > 0 ? (
          <button
            type="button"
            onClick={exportMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg border border-nd-accent/30 bg-nd-accent/10 px-3 py-1.5 text-xs font-semibold text-nd-accent transition hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
            aria-label="Export portfolio as Markdown"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export .md
          </button>
        ) : undefined}
      >
        <div className="p-4">
          {entries.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Portfolio is empty"
              description="Complete labs to generate investigation evidence. Each completed lab can produce a portfolio entry."
            />
          ) : (
            <ul className="space-y-4">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-nd-text">{entry.labTitle}</p>
                      <p className="text-[11px] text-nd-text-muted/70">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {entry.skillsEarned.map((skill) => (
                        <Badge key={skill} tone="accent">{skill}</Badge>
                      ))}
                    </div>
                  </div>

                  {entry.summary && (
                    <p className="text-xs leading-5 text-nd-text-muted">{entry.summary}</p>
                  )}

                  {entry.findings.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-nd-text-muted/50">Findings</p>
                      <ul className="space-y-0.5">
                        {entry.findings.map((f, i) => (
                          <li key={i} className="text-xs text-nd-text/80">• {f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.mitreMappings.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.mitreMappings.map((m) => (
                        <Badge key={m} tone="warning">{m}</Badge>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>
    </div>
  );
}
