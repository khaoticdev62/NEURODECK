import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, FileText, ShieldAlert } from 'lucide-react';
import { Badge } from '../../../components/primitives/Badge';
import { Button } from '../../../components/primitives/Button';
import { entryToMarkdown, entryToResumeBullet } from '../utils/portfolioExport';
import type { AcademyPortfolioEntry } from '../../../services/bridgeAdapter';

type Entry = AcademyPortfolioEntry;

const SKILL_LABEL: Record<string, string> = {
  'it-foundations': 'IT Foundations',
  networking: 'Networking',
  'operating-systems': 'Operating Systems',
  'security-fundamentals': 'Security Fundamentals',
  'soc-triage': 'SOC Triage',
  'log-analysis': 'Log Analysis',
};

interface PortfolioCardProps {
  entry: Entry;
  defaultExpanded?: boolean;
}

export function PortfolioCard({ entry, defaultExpanded = false }: PortfolioCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedResume, setCopiedResume] = useState(false);
  const isSoc = entry.labId.startsWith('soc-session');
  const Icon = isSoc ? ShieldAlert : FileText;
  const iconColor = isSoc ? 'text-nd-accent-error' : 'text-nd-accent-primary';

  async function copyMarkdown() {
    await navigator.clipboard.writeText(entryToMarkdown(entry));
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 1800);
  }

  async function copyResume() {
    await navigator.clipboard.writeText(entryToResumeBullet(entry));
    setCopiedResume(true);
    setTimeout(() => setCopiedResume(false), 1800);
  }

  return (
    <article className="rounded-2xl border border-nd-border-subtle bg-nd-surface-base/50 transition hover:border-nd-accent/20">
      {/* Card header — always visible */}
      <button
        type="button"
        className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/50 focus-visible:ring-inset"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className={`mt-0.5 shrink-0 ${iconColor}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-nd-text-primary">{entry.labTitle}</p>
            {isSoc && <Badge tone="danger">SOC</Badge>}
          </div>
          <p className="mt-0.5 text-[11px] text-nd-text-muted/60">
            {new Date(entry.timestamp).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
          {entry.summary && !expanded && (
            <p className="mt-1 text-[11px] text-nd-text-secondary line-clamp-1">{entry.summary}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {entry.skillsEarned.slice(0, 2).map((s) => (
            <Badge key={s} tone="accent">
              {SKILL_LABEL[s] ?? s}
            </Badge>
          ))}
          {entry.skillsEarned.length > 2 && (
            <Badge tone="neutral">+{entry.skillsEarned.length - 2}</Badge>
          )}
          <div className="ml-1 text-nd-text-muted/40">
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="space-y-3 border-t border-nd-border-subtle/50 px-4 pb-4 pt-3">
          {/* Summary */}
          {entry.summary && (
            <p className="text-[11px] leading-relaxed text-nd-text-secondary">{entry.summary}</p>
          )}

          {/* Findings */}
          {entry.findings.length > 0 && (
            <section>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
                Findings ({entry.findings.length})
              </p>
              <ul className="space-y-1">
                {entry.findings.map((f, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-nd-text-secondary">
                    <span className="shrink-0 text-nd-accent-primary/60">›</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Commands */}
          {entry.commandsUsed.length > 0 && (
            <section>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
                Commands / Queries
              </p>
              <pre className="overflow-x-auto rounded-md border border-nd-border-subtle bg-black/40 px-3 py-2 text-[10px] font-mono text-nd-text-secondary leading-5">
                {entry.commandsUsed.join('\n')}
              </pre>
            </section>
          )}

          {/* MITRE */}
          {entry.mitreMappings.length > 0 && (
            <section>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
                MITRE ATT&CK
              </p>
              <div className="flex flex-wrap gap-1">
                {entry.mitreMappings.map((m) => (
                  <span
                    key={m}
                    className="rounded bg-nd-accent/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-nd-accent-primary"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {entry.skillsEarned.length > 0 && (
            <section>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
                Skills Demonstrated
              </p>
              <div className="flex flex-wrap gap-1">
                {entry.skillsEarned.map((s) => (
                  <Badge key={s} tone="accent">
                    {SKILL_LABEL[s] ?? s}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 border-t border-nd-border-subtle/40 pt-2">
            <Button
              size="xs"
              variant="ghost"
              icon={copiedMd ? Check : Copy}
              iconPosition="left"
              onClick={copyMarkdown}
            >
              {copiedMd ? 'Copied MD' : 'Copy MD'}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              icon={copiedResume ? Check : Copy}
              iconPosition="left"
              onClick={copyResume}
            >
              {copiedResume ? 'Copied Bullet' : 'Copy Resume Bullet'}
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
