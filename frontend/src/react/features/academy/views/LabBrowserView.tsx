import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { EmptyState } from '../../../components/primitives/EmptyState';
import { Panel } from '../../../components/primitives/Panel';
import { LabCard } from '../components/LabCard';
import { STARTER_LABS, LEARNING_PATHS } from '../data/curricula';
import type { LearnerProgress, LabType, Difficulty } from '../types';

type FilterType = LabType | 'all';
type FilterPath = string | 'all';

const TYPE_FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'log-analysis', label: 'Log Analysis' },
  { value: 'terminal', label: 'Terminal' },
  { value: 'soc-alert', label: 'SOC Alert' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'packet', label: 'Packet' },
  { value: 'cloud', label: 'Cloud' },
];

interface LabBrowserViewProps {
  progress: LearnerProgress;
  onStartLab: (labId: string) => void;
}

export function LabBrowserView({ progress, onStartLab }: LabBrowserViewProps) {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterPath, setFilterPath] = useState<FilterPath>('all');
  const [filterDiff, setFilterDiff] = useState<Difficulty | 0>(0);

  const allLabs = STARTER_LABS;

  const filtered = allLabs.filter((lab) => {
    if (filterType !== 'all' && lab.type !== filterType) return false;
    if (filterPath !== 'all' && lab.pathId !== filterPath) return false;
    if (filterDiff !== 0 && lab.difficulty !== filterDiff) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Lab filters">
        {/* Type filter */}
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilterType(value)}
              aria-pressed={filterType === value}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                filterType === value
                  ? 'border-nd-accent/40 bg-nd-accent/15 text-nd-accent'
                  : 'border-nd-text-muted/15 bg-nd-surface/30 text-nd-text-muted hover:border-nd-accent/20 hover:text-nd-text/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Path filter */}
        <select
          value={filterPath}
          onChange={(e) => setFilterPath(e.target.value)}
          aria-label="Filter by learning path"
          className="rounded-lg border border-nd-text-muted/15 bg-nd-surface/50 px-2.5 py-1 text-[11px] text-nd-text-muted focus:border-nd-accent/40 focus:outline-none focus:ring-1 focus:ring-nd-accent/30"
        >
          <option value="all">All Paths</option>
          {LEARNING_PATHS.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>

        {/* Difficulty filter */}
        <select
          value={filterDiff}
          onChange={(e) => setFilterDiff(Number(e.target.value) as Difficulty | 0)}
          aria-label="Filter by difficulty"
          className="rounded-lg border border-nd-text-muted/15 bg-nd-surface/50 px-2.5 py-1 text-[11px] text-nd-text-muted focus:border-nd-accent/40 focus:outline-none focus:ring-1 focus:ring-nd-accent/30"
        >
          <option value={0}>Any Difficulty</option>
          <option value={1}>Difficulty 1</option>
          <option value={2}>Difficulty 2</option>
          <option value={3}>Difficulty 3</option>
          <option value={4}>Difficulty 4</option>
          <option value={5}>Difficulty 5</option>
        </select>
      </div>

      {/* Result count */}
      <p className="text-[11px] text-nd-text-muted/70" aria-live="polite">
        {filtered.length} lab{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Lab list */}
      <Panel eyebrow="Labs" title="Available Labs">
        <div className="space-y-3 p-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No labs match these filters"
              description="Try broadening your search by clearing one or more filters."
            />
          ) : (
            filtered.map((lab) => (
              <LabCard
                key={lab.id}
                lab={lab}
                completed={progress.completedLabs.includes(lab.id)}
                onStart={onStartLab}
              />
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
