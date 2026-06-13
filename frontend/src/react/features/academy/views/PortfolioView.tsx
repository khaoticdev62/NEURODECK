import { useState, useEffect, useCallback } from 'react';
import { Download, FolderOpen, FileText, Copy, Check, ShieldAlert, Layers, Target, BookOpen } from 'lucide-react';
import { LoadingState } from '../../../components/primitives/LoadingState';
import { EmptyState } from '../../../components/primitives/EmptyState';
import { ErrorState } from '../../../components/primitives/ErrorState';
import { PortfolioCard } from '../components/PortfolioCard';
import {
  computeStats,
  entriesToMarkdown,
  entriesToResumeBullets,
  downloadText,
} from '../utils/portfolioExport';
import type { AcademyPortfolioEntry } from '../../../services/bridgeAdapter';
import { neurodeckApi } from '../../../services/bridgeAdapter';

type Entry = AcademyPortfolioEntry;
type FilterTab = 'all' | 'labs' | 'soc';

const FILTER_TABS: { id: FilterTab; label: string; icon: React.ElementType }[] = [
  { id: 'all',  label: 'All',          icon: Layers    },
  { id: 'labs', label: 'Lab Reports',  icon: FileText  },
  { id: 'soc',  label: 'SOC Sessions', icon: ShieldAlert },
];

function StatChip({ icon: Icon, value, label }: { icon: React.ElementType; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-base/60 px-3 py-2">
      <Icon className="h-4 w-4 text-nd-accent shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-bold text-nd-text-primary leading-none">{value}</p>
        <p className="text-[10px] text-nd-text-muted/50 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function CopyAllButton({ content, label }: { content: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-nd-border-subtle px-3 py-1.5 text-xs text-nd-text-secondary transition hover:border-nd-accent/30 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-nd-success" /> : <Copy className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

export function PortfolioView() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showResume, setShowResume] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await neurodeckApi.academy.listPortfolio();
      setEntries(data);
    } catch (e) {
      // Fall back to localStorage-persisted SOC entries merged with bridge entries
      try {
        const raw = localStorage.getItem('neurodeck_academy_portfolio_local');
        setEntries(raw ? (JSON.parse(raw) as Entry[]) : []);
      } catch {
        setError(e instanceof Error ? e.message : 'Failed to load portfolio');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter((e) => {
    if (filter === 'soc') return e.labId.startsWith('soc-session');
    if (filter === 'labs') return !e.labId.startsWith('soc-session');
    return true;
  });

  const stats = computeStats(entries);

  if (loading) return <LoadingState label="Loading portfolio…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-nd-text-primary">Investigation Portfolio</h3>
          <p className="mt-0.5 text-[11px] text-nd-text-muted/60">
            Evidence from completed labs and SOC triage sessions
          </p>
        </div>

        {entries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadText(entriesToMarkdown(entries), `soc-portfolio-${Date.now()}.md`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-nd-accent/30 bg-nd-accent/10 px-3 py-1.5 text-xs font-semibold text-nd-accent transition hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
              aria-label="Download portfolio as Markdown"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export .md
            </button>
            <button
              type="button"
              onClick={() => setShowResume((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                showResume
                  ? 'border-nd-accent/40 bg-nd-accent/15 text-nd-accent'
                  : 'border-nd-border-subtle text-nd-text-secondary hover:border-nd-accent/20 hover:text-nd-text-primary'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              Resume Bullets
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatChip icon={FolderOpen} value={stats.totalEntries} label="Entries" />
          <StatChip icon={Target} value={stats.totalFindings} label="Findings" />
          <StatChip icon={ShieldAlert} value={stats.uniqueMitre.length} label="MITRE Techniques" />
          <StatChip icon={BookOpen} value={stats.uniqueSkills.length} label="Skills Demonstrated" />
        </div>
      )}

      {/* Resume bullets panel */}
      {showResume && entries.length > 0 && (
        <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-base/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-nd-text-primary">Resume / LinkedIn Bullets</p>
              <p className="text-[10px] text-nd-text-muted/50">STAR-format bullets ready to paste</p>
            </div>
            <CopyAllButton content={entriesToResumeBullets(entries)} label="Copy All" />
          </div>
          <pre className="whitespace-pre-wrap rounded-md border border-nd-border-subtle bg-black/30 px-3 py-2.5 text-[11px] font-mono text-nd-text-secondary leading-6 overflow-x-auto">
            {entriesToResumeBullets(entries)}
          </pre>
        </div>
      )}

      {/* Filter tabs */}
      {entries.length > 0 && (
        <nav className="flex gap-1" role="tablist" aria-label="Portfolio filter">
          {FILTER_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                filter === id
                  ? 'bg-nd-accent/15 text-nd-accent'
                  : 'text-nd-text-secondary hover:bg-nd-surface/40 hover:text-nd-text-primary'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      )}

      {/* Entries */}
      {entries.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Portfolio is empty"
          description="Complete labs and SOC triage sessions to generate investigation evidence. Each completed activity creates a portfolio entry."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={`No ${filter === 'soc' ? 'SOC sessions' : 'lab reports'} yet`}
          description={filter === 'soc'
            ? 'Complete the SOC Console triage to generate session entries.'
            : 'Start a lab from the Labs tab to generate report entries.'}
        />
      ) : (
        <ul className="space-y-2" role="list" aria-label="Portfolio entries">
          {filtered.map((entry, idx) => (
            <li key={entry.id}>
              <PortfolioCard entry={entry} defaultExpanded={idx === 0 && filtered.length === 1} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
