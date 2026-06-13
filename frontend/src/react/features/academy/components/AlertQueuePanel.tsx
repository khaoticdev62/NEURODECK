import { Badge } from '../../../components/primitives/Badge';
import { alertScoreTone } from '../utils/socGrading';
import type { SocAlert, AlertAnalysisState } from '../types';

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-nd-danger',
  high:     'bg-nd-warning',
  medium:   'bg-nd-accent',
  low:      'bg-nd-text-muted/40',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'CRIT',
  high:     'HIGH',
  medium:   'MED',
  low:      'LOW',
};

const SEVERITY_TONE: Record<string, 'danger' | 'warning' | 'accent' | 'neutral'> = {
  critical: 'danger',
  high:     'warning',
  medium:   'accent',
  low:      'neutral',
};

const SOURCE_LABEL: Record<string, string> = {
  edr:       'EDR',
  siem:      'SIEM',
  ids:       'IDS',
  firewall:  'FW',
  av:        'AV',
  'email-gw': 'Email',
};

interface AlertQueuePanelProps {
  alerts: SocAlert[];
  selectedId: string | null;
  analyses: Record<string, AlertAnalysisState>;
  onSelect: (id: string) => void;
}

export function AlertQueuePanel({ alerts, selectedId, analyses, onSelect }: AlertQueuePanelProps) {
  const completedCount = alerts.filter((a) => analyses[a.id]?.graded).length;

  return (
    <aside
      className="flex h-full w-60 shrink-0 flex-col border-r border-nd-border-subtle bg-nd-surface-base/40"
      aria-label="Alert queue"
    >
      {/* Queue header */}
      <div className="border-b border-nd-border-subtle px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
          Alert Queue
        </p>
        <p className="mt-0.5 text-[11px] text-nd-text-muted/50">
          {completedCount} of {alerts.length} analysed
        </p>
      </div>

      {/* Alert list */}
      <ul className="flex-1 overflow-y-auto py-1" role="listbox" aria-label="Alerts">
        {alerts.map((alert) => {
          const analysis = analyses[alert.id];
          const isSelected = alert.id === selectedId;
          const isGraded = analysis?.graded ?? false;
          const score = analysis?.gradeResult?.score ?? null;

          return (
            <li key={alert.id} role="option" aria-selected={isSelected}>
              <button
                type="button"
                onClick={() => onSelect(alert.id)}
                className={`w-full px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 focus-visible:ring-inset ${
                  isSelected
                    ? 'bg-nd-accent/10 border-l-2 border-nd-accent'
                    : 'border-l-2 border-transparent hover:bg-nd-surface/40'
                }`}
              >
                {/* Severity + source row */}
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${SEVERITY_DOT[alert.severity]}`} aria-hidden="true" />
                  <Badge tone={SEVERITY_TONE[alert.severity]}>{SEVERITY_LABEL[alert.severity]}</Badge>
                  <span className="text-[10px] text-nd-text-muted/50 ml-auto">{SOURCE_LABEL[alert.source]}</span>
                </div>

                {/* Title */}
                <p className={`text-[11px] leading-4 ${isSelected ? 'font-semibold text-nd-text-primary' : 'text-nd-text-secondary'}`}>
                  {alert.title}
                </p>

                {/* Score or timestamp */}
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-nd-text-muted/40">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isGraded && score !== null && (
                    <Badge tone={alertScoreTone(score)}>{score}</Badge>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
