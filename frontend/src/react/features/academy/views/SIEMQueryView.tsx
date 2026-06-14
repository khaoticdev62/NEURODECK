import { useState, useId, KeyboardEvent } from 'react';
import { Play, ChevronDown, ChevronUp, CheckCircle2, XCircle, BookOpen, Database } from 'lucide-react';
import { Badge } from '../../../components/primitives/Badge';
import { Button } from '../../../components/primitives/Button';
import { EmptyState } from '../../../components/primitives/EmptyState';
import { SIEM_EVENTS } from '../data/siemEvents';
import { executeQuery, SIEM_CHALLENGES, gradeChallenge } from '../utils/siemQuery';
import type { SiemEvent } from '../data/siemEvents';
import type { SiemChallenge } from '../utils/siemQuery';

const SEVERITY_TONE: Record<string, 'danger' | 'warning' | 'accent' | 'neutral'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'accent',
  low: 'neutral',
  info: 'neutral',
};

const REFERENCE = `# SIEM Query Language — Quick Reference

## Field Search
  source:firewall         Match events where source = "firewall"
  user:jdoe               Match events for user jdoe
  severity:high           Match high-severity events
  ip:10.20.*              Wildcard — match any Finance subnet IP
  process:powershell*     Prefix wildcard
  ip:*185.220*            Contains wildcard

## Boolean Operators
  event_type:auth_fail AND NOT ip:10.*    Failures from external IPs
  source:firewall OR source:proxy         Either source
  severity:high OR severity:critical      High or critical

## Keyword Search
  powershell              Search all fields for "powershell"
  "Failed password"       Quoted phrase — exact substring

## Negation
  NOT ip:10.*             Exclude internal IPs
  NOT user:SYSTEM         Exclude SYSTEM user events

## Available Fields
  id · timestamp · source · host · user · ip
  event_type · severity · process · message · raw

## Common source Values
  edr · siem · firewall · proxy · dns · av · syslog

## Common event_type Values
  auth_fail · auth_success · process_exec
  network_allow · network_block · dns_query
  av_alert · file_access · web_access · scheduled_task`;

function ResultRow({ event, expanded }: { event: SiemEvent; expanded: boolean }) {
  return (
    <div
      className={`border-b border-nd-border-subtle/30 px-3 py-1.5 ${expanded ? 'bg-nd-surface-base/20' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-14 shrink-0 font-mono text-[10px] text-nd-text-muted/40">
          {event.id}
        </span>
        <Badge tone={SEVERITY_TONE[event.severity]} size="sm">
          {event.severity}
        </Badge>
        <span className="shrink-0 text-[10px] text-nd-text-muted/60">
          {event.source.toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-nd-text-secondary">
          {event.message}
        </span>
        <span className="hidden shrink-0 text-[10px] text-nd-text-muted/50 sm:block">
          {new Date(event.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      </div>
      {expanded && (
        <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap rounded-md bg-black/30 px-2 py-1 font-mono text-[10px] leading-4 text-nd-text-muted/80">
          {event.raw}
        </pre>
      )}
    </div>
  );
}

function ChallengePanel({
  challenge,
  results,
  onLoad,
}: {
  challenge: SiemChallenge;
  results: SiemEvent[] | null;
  onLoad: (query: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const grade = results !== null ? gradeChallenge(challenge, results) : null;

  return (
    <div className="overflow-hidden rounded-lg border border-nd-border-subtle bg-nd-surface-base/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-nd-surface-base/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40 focus-visible:ring-inset"
        aria-expanded={open}
      >
        {grade ? (
          grade.passed ? (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-nd-accent-success" />
          ) : (
            <XCircle className="h-3.5 w-3.5 shrink-0 text-nd-accent-error" />
          )
        ) : (
          <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-nd-border-subtle" />
        )}
        <span className="flex-1 text-[11px] font-medium text-nd-text-secondary">
          {challenge.title}
        </span>
        {grade && <Badge tone={grade.passed ? 'success' : 'danger'}>{grade.score}</Badge>}
        {open ? (
          <ChevronUp className="h-3 w-3 text-nd-text-muted/40" />
        ) : (
          <ChevronDown className="h-3 w-3 text-nd-text-muted/40" />
        )}
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-nd-border-subtle bg-nd-surface-base/30 px-3 py-2.5">
          <p className="text-[11px] leading-relaxed text-nd-text-secondary">
            {challenge.description}
          </p>
          <p className="text-[10px] italic text-nd-text-muted/60">{challenge.hint}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border border-nd-border-subtle bg-nd-surface-base/40 px-2 py-1 text-[10px] font-mono text-nd-accent-primary">
              {challenge.exampleQuery}
            </code>
            <Button size="xs" variant="ghost" onClick={() => onLoad(challenge.exampleQuery)}>
              Load
            </Button>
          </div>
          {grade && (
            <p
              className={`text-[11px] font-medium ${
                grade.passed ? 'text-nd-accent-success' : 'text-nd-accent-error'
              }`}
            >
              {grade.feedback}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function SIEMQueryView() {
  const queryId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SiemEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRef, setShowRef] = useState(false);
  // track last-run query per challenge for grading
  const [challengeResults, setChallengeResults] = useState<Record<string, SiemEvent[]>>({});
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);

  function runQuery() {
    if (!query.trim()) {
      setResults(null);
      setError(null);
      return;
    }
    const { results: res, error: err } = executeQuery(SIEM_EVENTS, query.trim());
    if (err) {
      setError(err);
      setResults(null);
      return;
    }
    setError(null);
    setResults(res);
    // attribute to active challenge if one is loaded
    if (activeChallenge) {
      setChallengeResults((prev) => ({ ...prev, [activeChallenge]: res }));
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      runQuery();
    }
  }

  function loadChallenge(id: string, q: string) {
    setQuery(q);
    setActiveChallenge(id);
    setResults(null);
    setError(null);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-nd-border-subtle px-4 py-2.5">
        <Database className="h-4 w-4 shrink-0 text-nd-accent-primary" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-nd-text-primary">SIEM Query Sandbox</p>
          <p className="text-[10px] text-nd-text-muted/60">
            Search {SIEM_EVENTS.length} events from a simulated incident
          </p>
        </div>
        <Button
          size="xs"
          variant={showRef ? 'soft' : 'secondary'}
          icon={BookOpen}
          onClick={() => setShowRef((v) => !v)}
        >
          Reference
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: challenges panel */}
        <aside className="flex w-56 shrink-0 flex-col overflow-hidden border-r border-nd-border-subtle bg-nd-surface-base/40">
          <div className="shrink-0 border-b border-nd-border-subtle px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
              Hunt Challenges
            </p>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
            {SIEM_CHALLENGES.map((ch) => (
              <ChallengePanel
                key={ch.id}
                challenge={ch}
                results={challengeResults[ch.id] ?? null}
                onLoad={(q) => loadChallenge(ch.id, q)}
              />
            ))}
          </div>
        </aside>

        {/* Right: query editor + results */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Reference overlay */}
          {showRef && (
            <div className="absolute inset-0 z-10 overflow-auto bg-nd-surface-base/95 p-6 backdrop-blur-sm">
              <div className="mx-auto max-w-2xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-nd-text-primary">Query Language Reference</p>
                  <Button size="xs" variant="ghost" onClick={() => setShowRef(false)}>
                    Close
                  </Button>
                </div>
                <pre className="rounded-xl border border-nd-border-subtle bg-nd-surface-base/60 p-4 font-mono text-[11px] leading-6 text-nd-text-secondary">
                  {REFERENCE}
                </pre>
              </div>
            </div>
          )}

          {/* Query editor */}
          <div className="shrink-0 space-y-2 border-b border-nd-border-subtle bg-nd-surface-base/30 p-3">
            <div className="relative">
              <label htmlFor={queryId} className="sr-only">
                SIEM query
              </label>
              <textarea
                id={queryId}
                rows={2}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                placeholder="event_type:auth_fail AND NOT ip:10.*      (Ctrl+Enter to run)"
                className="w-full resize-none rounded-xl border border-nd-border-subtle bg-nd-surface-base/60 px-3 py-2 font-mono text-[12px] text-nd-text-primary placeholder:text-nd-text-muted/30 focus:border-nd-accent-primary/40 focus:outline-none focus:ring-1 focus:ring-nd-accent-primary/20"
                style={{ maxHeight: '80px' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="soft" icon={Play} onClick={runQuery}>
                Run Query
              </Button>
              {results !== null && (
                <span className="text-[11px] text-nd-text-muted/70">
                  {results.length} event{results.length !== 1 ? 's' : ''} matched
                </span>
              )}
              {error && <span className="text-[11px] text-nd-accent-error">{error}</span>}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {results === null && !error && (
              <EmptyState
                icon={Database}
                title="Run a query to search events"
                description="Or load a Hunt Challenge from the left panel."
                compact
              />
            )}
            {results !== null && results.length === 0 && (
              <EmptyState
                icon={Database}
                title="No events matched"
                description="Try broadening your query."
                compact
              />
            )}
            {results !== null && results.length > 0 && (
              <div>
                <div className="sticky top-0 flex items-center justify-between border-b border-nd-border-subtle bg-nd-surface-base/80 px-3 py-1.5 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
                    Results — {results.length} event{results.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] text-nd-text-muted/50">Click row to expand raw log</p>
                </div>
                {results.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() =>
                      setExpandedId((prev) => (prev === event.id ? null : event.id))
                    }
                    className="w-full text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40 focus-visible:ring-inset"
                    aria-expanded={expandedId === event.id}
                  >
                    <ResultRow event={event} expanded={expandedId === event.id} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
