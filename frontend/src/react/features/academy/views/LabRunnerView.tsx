import { useState, useCallback } from 'react';
import { ArrowLeft, Check, Shield } from 'lucide-react';
import { Badge } from '../../../components/primitives/Badge';
import { ErrorState } from '../../../components/primitives/ErrorState';
import { DatasetViewer } from '../components/DatasetViewer';
import { TaskCard } from '../components/TaskCard';
import { SkillBar } from '../components/SkillBar';
import { MentorPanel } from '../components/MentorPanel';
import { labOverallScore, scoreLabel, scoreTone } from '../utils/grading';
import { SKILL_LABELS } from '../types';
import { neurodeckApi } from '../../../services/bridgeAdapter';
import type { AcademyLearnerProgress } from '../../../services/bridgeAdapter';
import type { Lab, LearnerProgress } from '../types';
import type { GradeResult } from '../utils/grading';

const PROGRESS_LS_KEY = 'neurodeck_academy_progress';

type RunnerPhase = 'running' | 'complete' | 'saved';

interface LabRunnerViewProps {
  lab: Lab;
  progress: LearnerProgress;
  onBack: () => void;
  onLabComplete: (updatedProgress: LearnerProgress) => void;
}

export function LabRunnerView({ lab, progress, onBack, onLabComplete }: LabRunnerViewProps) {
  const [taskResults, setTaskResults] = useState<Record<string, GradeResult>>({});
  const [currentTaskIdx, setCurrentTaskIdx] = useState(0);
  const [phase, setPhase] = useState<RunnerPhase>('running');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentTask = lab.tasks[currentTaskIdx];
  const totalTasks = lab.tasks.length;
  const gradedCount = Object.keys(taskResults).length;
  const overallScore = labOverallScore(Object.values(taskResults).map((r) => r.score));

  const handleGraded = useCallback((taskId: string, result: GradeResult) => {
    setTaskResults((prev) => ({ ...prev, [taskId]: result }));
  }, []);

  const handleNext = useCallback(() => {
    const nextIdx = currentTaskIdx + 1;
    if (nextIdx >= totalTasks) {
      setPhase('complete');
    } else {
      setCurrentTaskIdx(nextIdx);
    }
  }, [currentTaskIdx, totalTasks]);

  async function handleAddToPortfolio() {
    setSaving(true);
    setSaveError(null);
    try {
      const findings = lab.tasks.map((t, i) =>
        `Task ${i + 1} (${t.type}): ${t.prompt.slice(0, 80)}${t.prompt.length > 80 ? '…' : ''}`
      );

      const payload = {
        labId: lab.id,
        labTitle: lab.title,
        score: overallScore,
        findings,
        commandsUsed: [] as string[],
        mitreMappings: lab.mitreMappings,
        skillsEarned: lab.skillsEarned as string[],
        currentProgress: progress as AcademyLearnerProgress,
      };

      const result = await neurodeckApi.academy.completeLab(payload);
      onLabComplete(result.updatedProgress as LearnerProgress);
      setPhase('saved');
    } catch (e) {
      // Sidecar unavailable — compute updates locally and persist to localStorage
      try {
        const updated: LearnerProgress = {
          ...progress,
          completedLabs: progress.completedLabs.includes(lab.id)
            ? progress.completedLabs
            : [...progress.completedLabs, lab.id],
          skillScores: { ...progress.skillScores },
          lastActive: new Date().toISOString(),
        };
        for (const skill of lab.skillsEarned) {
          const cur = updated.skillScores[skill] ?? 0;
          const gain = Math.round((overallScore / 100) * 25 * (1 - cur / 100));
          updated.skillScores[skill] = Math.min(100, cur + gain);
        }
        localStorage.setItem(PROGRESS_LS_KEY, JSON.stringify(updated));
        onLabComplete(updated);
        setPhase('saved');
      } catch {
        setSaveError(e instanceof Error ? e.message : 'Failed to save — check connection to sidecar.');
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Saved confirmation ─────────────────────────────────────────────────────
  if (phase === 'saved') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-nd-success/30 bg-nd-success/10">
          <Check className="h-8 w-8 text-nd-success" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-bold text-nd-text-primary">Lab Complete</p>
          <p className="mt-1 text-sm text-nd-text-secondary">
            Added to your portfolio. Score: {overallScore}/100
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-5 py-2.5 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          Back to Academy
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Runner header */}
      <header className="shrink-0 border-b border-nd-border-subtle bg-nd-surface-base/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Academy"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-nd-border-subtle transition hover:bg-nd-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            <ArrowLeft className="h-4 w-4 text-nd-text-secondary" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-nd-text-primary">{lab.title}</p>
            <p className="text-[11px] text-nd-text-muted/70">{lab.estimatedMinutes} min · {totalTasks} tasks</p>
          </div>
          <Badge tone="neutral">{lab.type.replace('-', ' ')}</Badge>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-nd-text-muted/60">
            <span>{phase === 'complete' ? 'All tasks complete' : `Task ${currentTaskIdx + 1} of ${totalTasks}`}</span>
            <span>{gradedCount}/{totalTasks} graded</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-nd-surface/60">
            <div
              className="h-full rounded-full bg-nd-accent transition-all duration-500"
              style={{ width: `${totalTasks > 0 ? (gradedCount / totalTasks) * 100 : 0}%` }}
              role="progressbar"
              aria-valuenow={gradedCount}
              aria-valuemin={0}
              aria-valuemax={totalTasks}
              aria-label={`Lab progress: ${gradedCount} of ${totalTasks} tasks graded`}
            />
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Dataset */}
        <section aria-label="Lab dataset">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-nd-text-muted/60">Dataset</p>
          <DatasetViewer
            sections={
              lab.datasetSections && lab.datasetSections.length > 0
                ? lab.datasetSections
                : [{ label: 'Dataset', content: lab.datasetStub, format: 'log' }]
            }
            maxHeight={280}
          />
        </section>

        {/* Tasks */}
        {phase === 'running' && currentTask && (
          <TaskCard
            key={currentTask.id}
            task={currentTask}
            taskNumber={currentTaskIdx + 1}
            totalTasks={totalTasks}
            isLastTask={currentTaskIdx === totalTasks - 1}
            onGraded={handleGraded}
            onNext={handleNext}
            existingResult={taskResults[currentTask.id]}
          />
        )}

        {/* Completion summary */}
        {phase === 'complete' && (
          <section aria-label="Lab results" className="space-y-4">
            {/* Score header */}
            <div className={`rounded-2xl border px-5 py-4 ${
              overallScore >= 60
                ? 'border-nd-success/20 bg-nd-success/[0.05]'
                : 'border-nd-warning/20 bg-nd-warning/[0.05]'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border font-mono text-xl font-bold ${
                  overallScore >= 60
                    ? 'border-nd-success/30 bg-nd-success/10 text-nd-success'
                    : 'border-nd-warning/30 bg-nd-warning/10 text-nd-warning'
                }`}>
                  {overallScore}
                </div>
                <div>
                  <p className="text-sm font-bold text-nd-text-primary">{scoreLabel(overallScore)}</p>
                  <p className="text-xs text-nd-text-secondary">Overall score</p>
                </div>
                <div className="ml-auto">
                  <Badge tone={scoreTone(overallScore)} size="md">
                    {overallScore >= 60 ? 'Passed' : 'Review'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Per-task breakdown */}
            <div className="rounded-2xl border border-nd-border-subtle bg-nd-surface-base p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-nd-text-muted/60">Task Breakdown</p>
              {lab.tasks.map((task, i) => {
                const r = taskResults[task.id];
                const s = r?.score ?? 0;
                return (
                  <div key={task.id} className="flex items-center gap-3">
                    <span className="text-[11px] text-nd-text-muted/60 w-12 shrink-0">Task {i + 1}</span>
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-nd-surface/60">
                      <div
                        className={`h-full rounded-full transition-all ${s >= 75 ? 'bg-nd-success' : s >= 60 ? 'bg-nd-accent' : s > 0 ? 'bg-nd-warning' : 'bg-nd-text-muted/20'}`}
                        style={{ width: `${s}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-nd-text-muted/70 w-8 text-right">{s}</span>
                  </div>
                );
              })}
            </div>

            {/* Skills earned */}
            {lab.skillsEarned.length > 0 && (
              <div className="rounded-2xl border border-nd-border-subtle bg-nd-surface-base p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-nd-text-muted/60">Skills Earned</p>
                {lab.skillsEarned.map((skill) => (
                  <SkillBar
                    key={skill}
                    label={SKILL_LABELS[skill]}
                    score={Math.min(100, (progress.skillScores[skill] ?? 0) + Math.round((overallScore / 100) * 25))}
                  />
                ))}
              </div>
            )}

            {/* MITRE mappings */}
            {lab.mitreMappings.length > 0 && (
              <div className="rounded-2xl border border-nd-border-subtle bg-nd-surface-base p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-nd-text-muted/60" aria-hidden="true" />
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-nd-text-muted/60">MITRE ATT&CK</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lab.mitreMappings.map((m) => (
                    <Badge key={m} tone="warning">{m}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add to portfolio */}
            {saveError && <ErrorState message={saveError} onRetry={handleAddToPortfolio} />}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 rounded-xl border border-nd-border-subtle bg-nd-surface/40 px-4 py-2.5 text-sm font-medium text-nd-text-secondary transition hover:text-nd-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
              >
                Back without saving
              </button>
              <button
                type="button"
                onClick={handleAddToPortfolio}
                disabled={saving}
                className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-4 py-2.5 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Add to Portfolio'}
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Mentor panel — only visible while actively running tasks */}
      {phase === 'running' && (
        <MentorPanel
          context={[
            `Lab: ${lab.title}`,
            `Objectives: ${lab.objectives.join('; ')}`,
            currentTask ? `Current task: ${currentTask.prompt}` : '',
          ].filter(Boolean).join('\n')}
          greeting={`Ready when you are. What's your question about "${lab.title}"?`}
        />
      )}
    </div>
  );
}
