import { useState, useId, KeyboardEvent } from 'react';
import { Play, ChevronDown, ChevronUp, CheckCircle2, XCircle, BookOpen, Database } from 'lucide-react';
import { Badge } from '../../../components/primitives/Badge';
import { SIEM_EVENTS } from '../data/siemEvents';
import { executeQuery, SIEM_CHALLENGES, gradeChallenge } from '../utils/siemQuery';
import type { SiemEvent } from '../data/siemEvents';
import type { SiemChallenge } from '../utils/siemQuery';

const SEVERITY_TONE: Record<string, 'danger' | 'warning' | 'accent' | 'neutral'> = {
  critical: 'danger',
  high:     'warning',
  medium:   'accent',
  low:      'neutral',
  info:     'neutral',
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
    <div className={`border-b border-nd-border-subtle/30 px-3 py-1.5 ${expanded ? 'bg-nd-surface/20' : ''}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[10px] text-nd-text-muted/40 shrink-0 w-14">{event.id}</span>
        <Badge tone={SEVERITY_TONE[event.severity]}>{event.severity}</Badge>
        <span className="text-[10px] text-nd-text-muted/50 shrink-0">{event.source.toUpperCase()}</span>
        <span className="text-[11px] text-nd-text-secondary flex-1 min-w-0 truncate">{event.message}</span>
        <span className="text-[10px] text-nd-text-muted/40 shrink-0 hidden sm:block">
          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
      {expanded && (
        <pre className="mt-1.5 overflow-x-auto rounded-md bg-black/30 px-2 py-1 text-[10px] font-mono text-nd-text-muted/70 leading-4 whitespace-pre-wrap">
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
    <div className="rounded-lg border border-nd-border-subtle overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-nd-surface/20 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 focus-visible:ring-inset"
        aria-expanded={open}
      >
        {grade ? (
          grade.passed
            ? <CheckCircle2 className="h-3.5 w-3.5 text-nd-success shrink-0" />
            : <XCircle className="h-3.5 w-3.5 text-nd-danger shrink-0" />
        ) : (
          <div className="h-3.5 w-3.5 rounded-full border border-nd-border-subtle shrink-0" />
        )}
        <span className="flex-1 text-[11px] font-medium text-nd-text-secondary">{challenge.title}</span>
        {grade && (
          <Badge tone={grade.passed ? 'success' : 'danger'}>{grade.score}</Badge>
        )}
        {open ? <ChevronUp className="h-3 w-3 text-nd-text-muted/40" /> : <ChevronDown className="h-3 w-3 text-nd-text-muted/40" />}
      </button>

      {open && (
        <div className="border-t border-nd-border-subtle px-3 py-2.5 space-y-2.5 bg-nd-surface-base/30">
          <p className="text-[11px] text-nd-text-secondary leading-relaxed">{challenge.description}</p>
          <p className="text-[10px] text-nd-text-muted/50 italic">{challenge.hint}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-nd-surface/40 border border-nd-border-subtle px-2 py-1 text-[10px] font-mono text-nd-accent">
              {challenge.exampleQuery}
            </code>
            <button
              type="button"
              onClick={() => onLoad(challenge.exampleQuery)}
              className="shrink-0 rounded-md border border-nd-border-subtle px-2.5 py-1 text-[10px] text-nd-text-secondary transition hover:border-nd-accent/30 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40"
            >
              Load
            </button>
          </div>
          {grade && (
            <p className={`text-[11px] font-medium ${grade.passed ? 'text-nd-success' : 'text-nd-danger'}`}>
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
    if (!query.trim()) { setResults(null); setError(null); return; }
    const { results: res, error: err } = executeQuery(SIEM_EVENTS, query.trim());
    if (err) { setError(err); setResults(null); return; }
    setError(null);
    setResults(res);
    // attribute to active challenge if one is loaded
    if (activeChallenge) {
      setChallengeResults((prev) => ({ ...prev, [activeChallenge]: res }));
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runQuery(); }
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
      <div className="shrink-0 border-b border-nd-border-subtle px-4 py-2.5 flex items-center gap-3">
        <Database className="h-4 w-4 text-nd-accent shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-nd-text-primary">SIEM Query Sandbox</p>
          <p className="text-[10px] text-nd-text-muted/50">Search {SIEM_EVENTS.length} events from a simulated incident</p>
        </div>
        <button
          type="button"
          onClick={() => setShowRef((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 ${
            showRef
              ? 'border-nd-accent/30 bg-nd-accent/10 text-nd-accent'
              : 'border-nd-border-subtle text-nd-text-secondary hover:border-nd-accent/20'
          }`}
        >
          <BookOpen className="h-3 w-3" aria-hidden="true" />
          Reference
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: challenges panel */}
        <aside className="w-56 shrink-0 border-r border-nd-border-subtle flex flex-col overflow-hidden bg-nd-surface-base/40">
          <div className="shrink-0 px-3 py-2 border-b border-nd-border-subtle">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/50">Hunt Challenges</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
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
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-nd-text-primary">Query Language Reference</p>
                  <button
                    type="button"
                    onClick={() => setShowRef(false)}
                    className="text-xs text-nd-text-muted/60 hover:text-nd-text-primary transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 rounded"
                  >
                    Close
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-[11px] font-mono text-nd-text-secondary leading-6 bg-nd-surface-base/60 border border-nd-border-subtle rounded-xl p-4">
                  {REFERENCE}
                </pre>
              </div>
            </div>
          )}

          {/* Query editor */}
          <div className="shrink-0 border-b border-nd-border-subtle bg-nd-surface-base/30 p-3 space-y-2">
            <div className="relative">
              <label htmlFor={queryId} className="sr-only">SIEM query</label>
              <textarea
                id={queryId}
                rows={2}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                placeholder="event_type:auth_fail AND NOT ip:10.*      (Ctrl+Enter to run)"
                className="w-full resize-none rounded-lg border border-nd-border-subtle bg-nd-surface-base/60 px-3 py-2 font-mono text-[12px] text-nd-text-primary placeholder:text-nd-text-muted/30 focus:border-nd-accent/40 focus:outline-none focus:ring-1 focus:ring-nd-accent/20"
                style={{ maxHeight: '80px' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={runQuery}
                className="inline-flex items-center gap-1.5 rounded-lg bg-nd-accent/15 border border-nd-accent/30 px-3 py-1.5 text-xs font-semibold text-nd-accent transition hover:bg-nd-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
              >
                <Play className="h-3 w-3" aria-hidden="true" />
                Run Query
              </button>
              {results !== null && (
                <span className="text-[11px] text-nd-text-muted/60">
                  {results.length} event{results.length !== 1 ? 's' : ''} matched
                </span>
              )}
              {error && (
                <span className="text-[11px] text-nd-danger">{error}</span>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {results === null && !error && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Database className="mx-auto mb-3 h-8 w-8 text-nd-text-muted/15" aria-hidden="true" />
                  <p className="text-sm text-nd-text-muted/40">Run a query to search events</p>
                  <p className="mt-1 text-[11px] text-nd-text-muted/30">Or load a Hunt Challenge from the left panel</p>
                </div>
              </div>
            )}
            {results !== null && results.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-nd-text-muted/40">No events matched. Try broadening your query.</p>
              </div>
            )}
            {results !== null && results.length > 0 && (
              <div>
                <div className="sticky top-0 flex items-center justify-between border-b border-nd-border-subtle bg-nd-surface-base/80 px-3 py-1.5 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/50">
                    Results — {results.length} event{results.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] text-nd-text-muted/40">Click row to expand raw log</p>
                </div>
                {results.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setExpandedId((prev) => prev === event.id ? null : event.id)}
                    className="w-full text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 focus-visible:ring-inset"
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
