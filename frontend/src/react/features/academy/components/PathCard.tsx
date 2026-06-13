import { ChevronRight, Lock } from 'lucide-react';
import { Badge } from '../../../components/primitives/Badge';
import { SkillBar } from './SkillBar';
import type { LearningPath } from '../types';

const LEVEL_TONE: Record<string, 'accent' | 'warning' | 'danger'> = {
  beginner: 'accent',
  intermediate: 'warning',
  advanced: 'danger',
};

interface PathCardProps {
  path: LearningPath;
  completionPct: number;
  onSelect: (pathId: string) => void;
}

export function PathCard({ path, completionPct, onSelect }: PathCardProps) {
  return (
    <button
      type="button"
      disabled={path.locked}
      onClick={() => onSelect(path.id)}
      aria-label={path.locked ? `${path.title} — locked` : `Open ${path.title}`}
      className={`group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
        path.locked
          ? 'cursor-not-allowed border-nd-text-muted/10 bg-nd-surface/20 opacity-50'
          : 'border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/30 hover:bg-nd-surface/60'
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
        {path.locked
          ? <Lock className="h-5 w-5 text-nd-text-muted/50" aria-hidden="true" />
          : <span className="text-lg" aria-hidden="true">🎯</span>}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-sm font-semibold text-nd-text">{path.title}</p>
          <Badge tone={LEVEL_TONE[path.level] ?? 'neutral'}>{path.level}</Badge>
        </div>
        <p className="text-xs leading-5 text-nd-text-muted">{path.description}</p>
        <SkillBar label={`${path.modules.length} modules`} score={completionPct} compact />
      </div>

      {!path.locked && (
        <ChevronRight
          className="mt-1 h-4 w-4 shrink-0 text-nd-text-muted/40 transition group-hover:text-nd-accent"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
