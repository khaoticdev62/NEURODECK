import { useState, useCallback } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Badge } from '../../../components/primitives/Badge';
import { Button } from '../../../components/primitives/Button';
import { IconButton } from '../../../components/primitives/IconButton';
import { ErrorState } from '../../../components/primitives/ErrorState';
import { Panel } from '../../../components/primitives/Panel';
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
      const findings = lab.tasks.map(
        (t, i) =>
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
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-nd-accent-success/30 bg-nd-accent-success/10">
          <Check className="h-8 w-8 text-nd-accent-success" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-bold text-nd-text-primary">Lab Complete</p>
          <p className="mt-1 text-sm text-nd-text-secondary">
            Added to your portfolio. Score: {overallScore}/100
          </p>
        </div>
        <Button size="md" variant="soft" onClick={onBack}>
          Back to Academy
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Runner header */}
      <header className="shrink-0 border-b border-nd-border-subtle bg-nd-surface-base/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <IconButton
            size="md"
            variant="subtle"
            onClick={onBack}
            aria-label="Back to Academy"
          >
            <ArrowLeft className="h-4 w-4 text-nd-text-secondary" aria-hidden="true" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-nd-text-primary">{lab.title}</p>
            <p className="text-[11px] text-nd-text-muted/80">
              {lab.estimatedMinutes} min · {totalTasks} tasks
            </p>
          </div>
          <Badge tone="neutral">{lab.type.replace('-', ' ')}</Badge>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-nd-text-muted/70">
            <span>
              {phase === 'complete' ? 'All tasks complete' : `Task ${currentTaskIdx + 1} of ${totalTasks}`}
            </span>
            <span>
              {gradedCount}/{totalTasks} graded
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-nd-surface-tertiary/60">
            <div
              className="h-full rounded-full bg-nd-accent-primary transition-all duration-500 motion-reduce:transition-none"
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
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Dataset */}
        <section aria-label="Lab dataset">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
            Dataset
          </p>
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
            <Panel
              variant="surface"
              className={`${
                overallScore >= 60
                  ? 'border-nd-accent-success/20'
                  : 'border-nd-accent-warning/20'
              }`}
            >
              <div className="flex items-center gap-4 p-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border font-mono text-xl font-bold ${
                    overallScore >= 60
                      ? 'border-nd-accent-success/30 bg-nd-accent-success/10 text-nd-accent-success'
                      : 'border-nd-accent-warning/30 bg-nd-accent-warning/10 text-nd-accent-warning'
                  }`}
                >
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
            </Panel>

            {/* Per-task breakdown */}
            <Panel eyebrow="Breakdown" title="Task Breakdown" variant="surface">
              <div className="space-y-3 p-4">
                {lab.tasks.map((task, i) => {
                  const r = taskResults[task.id];
                  const s = r?.score ?? 0;
                  return (
                    <div key={task.id} className="flex items-center gap-3">
                      <span className="w-12 shrink-0 text-[11px] text-nd-text-muted/70">
                        Task {i + 1}
                      </span>
                      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-nd-surface-tertiary/60">
                        <div
                          className={`h-full rounded-full transition-all motion-reduce:transition-none ${
                            s >= 75
                              ? 'bg-nd-accent-success'
                              : s >= 60
                              ? 'bg-nd-accent-primary'
                              : s > 0
                              ? 'bg-nd-accent-warning'
                              : 'bg-nd-text-muted/20'
                          }`}
                          style={{ width: `${s}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] text-nd-text-muted/80">
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* Skills earned */}
            {lab.skillsEarned.length > 0 && (
              <Panel eyebrow="Skills" title="Skills Earned" variant="surface">
                <div className="space-y-3 p-4">
                  {lab.skillsEarned.map((skill) => (
                    <SkillBar
                      key={skill}
                      label={SKILL_LABELS[skill]}
                      score={Math.min(
                        100,
                        (progress.skillScores[skill] ?? 0) +
                          Math.round((overallScore / 100) * 25)
                      )}
                    />
                  ))}
                </div>
              </Panel>
            )}

            {/* MITRE mappings */}
            {lab.mitreMappings.length > 0 && (
              <Panel eyebrow="Framework" title="MITRE ATT&CK" variant="surface">
                <div className="flex flex-wrap gap-2 p-4">
                  {lab.mitreMappings.map((m) => (
                    <Badge key={m} tone="warning">
                      {m}
                    </Badge>
                  ))}
                </div>
              </Panel>
            )}

            {/* Add to portfolio */}
            {saveError && <ErrorState message={saveError} onRetry={handleAddToPortfolio} />}
            <div className="flex gap-3">
              <Button size="md" variant="secondary" fullWidth onClick={onBack}>
                Back without saving
              </Button>
              <Button
                size="md"
                variant="premium"
                fullWidth
                loading={saving}
                onClick={handleAddToPortfolio}
              >
                Add to Portfolio
              </Button>
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
          ]
            .filter(Boolean)
            .join('\n')}
          greeting={`Ready when you are. What's your question about "${lab.title}"?`}
        />
      )}
    </div>
  );
}
