import { GraduationCap } from 'lucide-react';
import { EmptyState } from '../../../components/primitives/EmptyState';
import { Panel } from '../../../components/primitives/Panel';
import { Button } from '../../../components/primitives/Button';
import { SkillBar } from '../components/SkillBar';
import { PathCard } from '../components/PathCard';
import { LabCard } from '../components/LabCard';
import { LEARNING_PATHS, ALL_LABS, pathCompletionPercent } from '../data/curricula';
import { SKILL_KEYS, SKILL_LABELS } from '../types';
import type { LearnerProgress, AcademyTab } from '../types';

interface AcademyHomeProps {
  progress: LearnerProgress;
  onNavigate: (tab: AcademyTab) => void;
  onStartLab: (labId: string) => void;
}

export function AcademyHome({ progress, onNavigate, onStartLab }: AcademyHomeProps) {
  const recentIds = progress.completedLabs.slice(-3).reverse();
  const totalCompleted = progress.completedLabs.length;
  const skillTotal = Object.values(progress.skillScores).reduce((a, b) => a + b, 0);
  const overallScore = SKILL_KEYS.length > 0 ? Math.round(skillTotal / SKILL_KEYS.length) : 0;

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <div className="rounded-2xl border border-nd-accent/20 bg-nd-accent/[0.06] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nd-accent/30 bg-nd-accent/10">
            <GraduationCap className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-nd-text-primary">
              {totalCompleted === 0
                ? 'Welcome to SOC Forge'
                : `${totalCompleted} lab${totalCompleted !== 1 ? 's' : ''} completed`}
            </p>
            <p className="text-xs text-nd-text-muted">
              {totalCompleted === 0
                ? 'Start a lab below to begin building your SOC skillset.'
                : `Overall skill score: ${overallScore} / 100`}
            </p>
          </div>
        </div>
      </div>

      {/* Skill overview */}
      <Panel eyebrow="Skills" title="Skill Overview">
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          {SKILL_KEYS.map((key) => (
            <SkillBar key={key} label={SKILL_LABELS[key]} score={progress.skillScores[key] ?? 0} />
          ))}
        </div>
      </Panel>

      {/* Quick start labs */}
      <Panel
        eyebrow="Quick Start"
        title="Starter Labs"
        action={
          <Button size="xs" variant="ghost" onClick={() => onNavigate('labs')}>
            View all
          </Button>
        }
      >
        <div className="space-y-3 p-4">
          {ALL_LABS.map((lab) => (
            <LabCard
              key={lab.id}
              lab={lab}
              completed={progress.completedLabs.includes(lab.id)}
              onStart={onStartLab}
            />
          ))}
        </div>
      </Panel>

      {/* Active tracks */}
      <Panel
        eyebrow="Tracks"
        title="Learning Paths"
        action={
          <Button size="xs" variant="ghost" onClick={() => onNavigate('paths')}>
            View all
          </Button>
        }
      >
        <div className="space-y-3 p-4">
          {LEARNING_PATHS.filter((p) => !p.locked).map((path) => (
            <PathCard
              key={path.id}
              path={path}
              completionPct={pathCompletionPercent(path.id, progress.completedLabs)}
              onSelect={() => onNavigate('paths')}
            />
          ))}
        </div>
      </Panel>

      {/* Recent activity */}
      <Panel eyebrow="Activity" title="Recent Completions">
        <div className="p-4">
          {recentIds.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No completed labs yet"
              description="Start your first lab to build your activity history and portfolio."
              compact
            />
          ) : (
            <ul className="space-y-2">
              {recentIds.map((id) => {
                const lab = ALL_LABS.find((l) => l.id === id);
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 rounded-xl border border-nd-border-subtle/50 bg-nd-surface-base/40 px-3 py-2"
                  >
                    <div className="h-2 w-2 rounded-full bg-nd-accent-success" aria-hidden="true" />
                    <span className="text-xs text-nd-text-secondary">{lab?.title ?? id}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Panel>
    </div>
  );
}
