import { Clock, Play } from 'lucide-react';
import { Badge } from '../../../components/primitives/Badge';
import type { Lab } from '../types';

const TYPE_LABELS: Record<string, string> = {
  'log-analysis': 'Log Analysis',
  'terminal': 'Terminal',
  'soc-alert': 'SOC Alert',
  'ticket': 'Help Desk Ticket',
  'packet': 'Packet Analysis',
  'cloud': 'Cloud Security',
};

const TYPE_TONE: Record<string, 'accent' | 'success' | 'warning' | 'neutral'> = {
  'log-analysis': 'accent',
  'terminal': 'success',
  'soc-alert': 'warning',
  'ticket': 'neutral',
  'packet': 'accent',
  'cloud': 'success',
};

interface LabCardProps {
  lab: Lab;
  completed: boolean;
  onStart: (labId: string) => void;
}

export function LabCard({ lab, completed, onStart }: LabCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 transition hover:border-nd-accent/20">
      {/* Difficulty pips */}
      <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5" aria-label={`Difficulty ${lab.difficulty} of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition ${
              i < lab.difficulty ? 'bg-nd-accent' : 'bg-nd-text-muted/20'
            }`}
          />
        ))}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={TYPE_TONE[lab.type] ?? 'neutral'}>{TYPE_LABELS[lab.type] ?? lab.type}</Badge>
          {completed && <Badge tone="success">Completed</Badge>}
        </div>
        <p className="text-sm font-semibold text-nd-text">{lab.title}</p>
        <p className="text-xs leading-5 text-nd-text-muted">{lab.objectives[0]}</p>
        <div className="flex items-center gap-1 text-[11px] text-nd-text-muted/70">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>{lab.estimatedMinutes} min</span>
          <span className="mx-1">·</span>
          <span>{lab.tasks.length} tasks</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onStart(lab.id)}
        aria-label={`${completed ? 'Redo' : 'Start'} ${lab.title}`}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-3 py-2 text-xs font-semibold text-nd-accent transition hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
      >
        <Play className="h-3.5 w-3.5" aria-hidden="true" />
        {completed ? 'Redo' : 'Start'}
      </button>
    </div>
  );
}
