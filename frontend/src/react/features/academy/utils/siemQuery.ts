import type { SiemEvent } from '../data/siemEvents';

// ── Query AST ─────────────────────────────────────────────────────────────────

type Operator = 'AND' | 'OR';

interface FieldTerm {
  kind: 'field';
  field: string;
  value: string;       // may contain * wildcard
  negated: boolean;
}

interface KeywordTerm {
  kind: 'keyword';
  value: string;
  negated: boolean;
}

export type QueryTerm = FieldTerm | KeywordTerm;

export interface ParsedQuery {
  terms: QueryTerm[];
  operator: Operator;
}

export interface QueryError {
  message: string;
}

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Minimal query parser supporting:
 *   field:value        exact or wildcard field match
 *   field:value*       prefix wildcard
 *   field:*value*      contains wildcard
 *   "quoted phrase"    literal keyword
 *   keyword            bare keyword (case-insensitive substring across all fields)
 *   NOT term           negation prefix
 *   term AND term      conjunction (default between adjacent terms)
 *   term OR term       disjunction
 */
export function parseQuery(raw: string): ParsedQuery | QueryError {
  const input = raw.trim();
  if (!input) return { terms: [], operator: 'AND' };

  const tokens = tokenise(input);
  if (!tokens.length) return { terms: [], operator: 'AND' };

  const terms: QueryTerm[] = [];
  let operator: Operator = 'AND';

  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];

    if (tok.toUpperCase() === 'AND') { operator = 'AND'; i++; continue; }
    if (tok.toUpperCase() === 'OR')  { operator = 'OR';  i++; continue; }

    let negated = false;
    if (tok.toUpperCase() === 'NOT') { negated = true; i++; }

    const term = tokens[i];
    if (!term) break;

    if (term.includes(':')) {
      const colonIdx = term.indexOf(':');
      const field = term.slice(0, colonIdx).toLowerCase();
      const value = term.slice(colonIdx + 1);
      if (!field || !value) return { message: `Invalid field term: "${term}". Use field:value syntax.` };
      terms.push({ kind: 'field', field, value, negated });
    } else {
      terms.push({ kind: 'keyword', value: term, negated });
    }
    i++;
  }

  return { terms, operator };
}

function tokenise(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    if (input[i] === ' ' || input[i] === '\t') { i++; continue; }

    if (input[i] === '"') {
      let j = i + 1;
      while (j < input.length && input[j] !== '"') j++;
      tokens.push(input.slice(i + 1, j));
      i = j + 1;
      continue;
    }

    let j = i;
    while (j < input.length && input[j] !== ' ' && input[j] !== '\t') j++;
    tokens.push(input.slice(i, j));
    i = j;
  }
  return tokens.filter(Boolean);
}

// ── Matcher ───────────────────────────────────────────────────────────────────

const SEARCHABLE_FIELDS: (keyof SiemEvent)[] = [
  'source', 'host', 'user', 'ip', 'event_type', 'severity', 'process', 'message', 'raw',
];

function matchesWildcard(pattern: string, text: string): boolean {
  if (!pattern.includes('*')) return text.toLowerCase() === pattern.toLowerCase();
  // Convert to regex: * → .*
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i').test(text);
}

function matchesTerm(event: SiemEvent, term: QueryTerm): boolean {
  if (term.kind === 'keyword') {
    const lower = term.value.toLowerCase();
    const hit = SEARCHABLE_FIELDS.some((f) => {
      const v = event[f];
      return v != null && String(v).toLowerCase().includes(lower);
    });
    return term.negated ? !hit : hit;
  }

  // Field term
  const eventVal = (event as Record<string, unknown>)[term.field];
  if (eventVal == null) return term.negated;
  const hit = matchesWildcard(term.value, String(eventVal));
  return term.negated ? !hit : hit;
}

export function runQuery(events: SiemEvent[], query: ParsedQuery): SiemEvent[] {
  if (!query.terms.length) return events;
  return events.filter((event) => {
    const results = query.terms.map((t) => matchesTerm(event, t));
    return query.operator === 'OR'
      ? results.some(Boolean)
      : results.every(Boolean);
  });
}

export function executeQuery(events: SiemEvent[], raw: string): { results: SiemEvent[]; error?: string; query?: ParsedQuery } {
  const parsed = parseQuery(raw);
  if ('message' in parsed) return { results: [], error: parsed.message };
  return { results: runQuery(events, parsed), query: parsed };
}

// ── SIEM Challenges ───────────────────────────────────────────────────────────

export interface SiemChallenge {
  id: string;
  title: string;
  description: string;
  hint: string;
  exampleQuery: string;
  /** Event IDs that must ALL appear in results to pass */
  requiredEventIds: string[];
  /** Minimum result count (can be used instead of / in addition to requiredEventIds) */
  minResults?: number;
}

export const SIEM_CHALLENGES: SiemChallenge[] = [
  {
    id: 'ch-1',
    title: 'Hunt: External Auth Failures',
    description: 'Find all authentication failure events that originated from external (non-RFC1918) IP addresses. These are potential brute-force or credential stuffing attempts.',
    hint: 'Auth failures are event_type:auth_fail. Internal IPs start with 10.*, 172.16-31.*, or 192.168.*. Try NOT ip:10.* with event_type:auth_fail.',
    exampleQuery: 'event_type:auth_fail NOT ip:10.*',
    requiredEventIds: ['e006', 'e007', 'e008', 'e009', 'e010', 'e011', 'e046', 'e047', 'e048'],
    minResults: 5,
  },
  {
    id: 'ch-2',
    title: 'Hunt: PowerShell Execution',
    description: 'Identify all PowerShell process execution events across all hosts. Look for encoded commands, bypass flags, and suspicious parents.',
    hint: 'PowerShell events have process:powershell.exe or the term powershell in the raw log. Try searching for the process field or keyword.',
    exampleQuery: 'process:powershell.exe',
    requiredEventIds: ['e017', 'e018', 'e019', 'e020', 'e021', 'e024'],
    minResults: 4,
  },
  {
    id: 'ch-3',
    title: 'Hunt: Finance Subnet Activity',
    description: 'Find all events involving the Finance department subnet (10.20.x.x). Review for unusual access patterns.',
    hint: 'Finance machines use the 10.20.x.x subnet. Try ip:10.20.* to match all Finance subnet IPs.',
    exampleQuery: 'ip:10.20.*',
    requiredEventIds: ['e025', 'e026', 'e027', 'e030', 'e050'],
    minResults: 4,
  },
  {
    id: 'ch-4',
    title: 'Hunt: Large Outbound Transfers',
    description: 'Identify high-severity firewall or proxy events that indicate large data transfers leaving the network. These are potential exfiltration indicators.',
    hint: 'Exfiltration events come from the firewall or proxy source with high/critical severity. Try source:firewall AND severity:high.',
    exampleQuery: 'source:firewall severity:high OR severity:critical',
    requiredEventIds: ['e031', 'e033'],
    minResults: 2,
  },
  {
    id: 'ch-5',
    title: 'Hunt: C2 Beaconing Indicators',
    description: 'Find all DNS queries and network events to known C2 infrastructure (91.234.55.119 or cdn-static.company-update.net).',
    hint: 'C2 indicators show up in DNS queries and firewall events. Try searching for the IP or domain name as a keyword.',
    exampleQuery: '91.234.55.119',
    requiredEventIds: ['e034', 'e050'],
    minResults: 2,
  },
];

export function gradeChallenge(
  challenge: SiemChallenge,
  results: SiemEvent[],
): { passed: boolean; score: number; feedback: string } {
  const resultIds = new Set(results.map((e) => e.id));
  const foundRequired = challenge.requiredEventIds.filter((id) => resultIds.has(id));
  const fractionFound = challenge.requiredEventIds.length > 0
    ? foundRequired.length / challenge.requiredEventIds.length
    : 1;

  const meetsMinimum = challenge.minResults == null || results.length >= challenge.minResults;

  const score = Math.round(fractionFound * 100);
  const passed = score >= 70 && meetsMinimum;

  let feedback: string;
  if (score === 100) {
    feedback = 'Perfect — all expected events captured.';
  } else if (score >= 70) {
    feedback = `Good query. Found ${foundRequired.length}/${challenge.requiredEventIds.length} expected events.`;
  } else {
    const missed = challenge.requiredEventIds.filter((id) => !resultIds.has(id)).length;
    feedback = `Query missed ${missed} expected event${missed > 1 ? 's' : ''}. Try broadening the filter or checking your field name.`;
  }

  return { passed, score, feedback };
}
