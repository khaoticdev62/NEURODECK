import { useState, useId } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '../../../components/primitives/Badge';
import { gradeAnswer, scoreTone } from '../utils/grading';
import type { LabTask } from '../types';
import type { GradeResult } from '../utils/grading';

const TASK_KIND_LABEL: Record<string, string> = {
  identify: 'Identify',
  classify: 'Classify',
  write: 'Write',
  command: 'Command',
};

interface TaskCardProps {
  task: LabTask;
  taskNumber: number;
  totalTasks: number;
  isLastTask: boolean;
  onGraded: (taskId: string, result: GradeResult) => void;
  onNext: () => void;
  existingResult?: GradeResult;
}

export function TaskCard({
  task,
  taskNumber,
  totalTasks,
  isLastTask,
  onGraded,
  onNext,
  existingResult,
}: TaskCardProps) {
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<GradeResult | undefined>(existingResult);
  const [hintOpen, setHintOpen] = useState(false);
  const promptId = useId();
  const answerId = useId();

  const isGraded = result !== undefined;

  function handleSubmit() {
    if (!answer.trim()) return;
    const r = gradeAnswer(task, answer);
    setResult(r);
    onGraded(task.id, r);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-nd-border-subtle bg-nd-surface-base p-5">
      {/* Task header */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
          Task {taskNumber} of {totalTasks}
        </span>
        <Badge tone="neutral">{TASK_KIND_LABEL[task.type] ?? task.type}</Badge>
        {isGraded && (
          result.passed
            ? <CheckCircle2 className="h-4 w-4 text-nd-success" aria-label="Passed" />
            : <XCircle className="h-4 w-4 text-nd-danger" aria-label="Did not pass" />
        )}
      </div>

      {/* Prompt */}
      <p id={promptId} className="text-sm font-medium leading-relaxed text-nd-text-primary">
        {task.prompt}
      </p>

      {/* Answer area */}
      {!isGraded ? (
        <div className="space-y-3">
          <textarea
            id={answerId}
            aria-labelledby={promptId}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here…"
            rows={4}
            className="w-full resize-none rounded-xl border border-nd-border-subtle bg-nd-surface/60 px-3 py-2.5 text-sm text-nd-text-primary placeholder:text-nd-text-muted/40 focus:border-nd-accent/40 focus:outline-none focus:ring-1 focus:ring-nd-accent/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />

          {/* Hint toggle */}
          {task.hint && (
            <button
              type="button"
              onClick={() => setHintOpen((v) => !v)}
              aria-expanded={hintOpen}
              className="inline-flex items-center gap-1 text-xs text-nd-text-muted hover:text-nd-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 rounded"
            >
              {hintOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Hint
            </button>
          )}
          {hintOpen && task.hint && (
            <p className="rounded-xl border border-nd-accent/15 bg-nd-accent/[0.04] px-3 py-2 text-xs leading-5 text-nd-text-secondary">
              {task.hint}
            </p>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!answer.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-4 py-2 text-xs font-semibold text-nd-accent transition hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit
              <span className="text-nd-accent/50 font-normal">⌘↵</span>
            </button>
          </div>
        </div>
      ) : (
        /* Grade result */
        <div className="space-y-4">
          {/* Your answer */}
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface/30 px-3 py-2.5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-nd-text-muted/50">Your answer</p>
            <p className="text-xs leading-5 text-nd-text-secondary">{answer || '(no answer)'}</p>
          </div>

          {/* Score badge + feedback */}
          <div className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${
            result.passed
              ? 'border-nd-success/20 bg-nd-success/[0.05]'
              : 'border-nd-danger/20 bg-nd-danger/[0.05]'
          }`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-mono text-sm font-bold ${
              result.passed
                ? 'border-nd-success/30 bg-nd-success/10 text-nd-success'
                : 'border-nd-danger/30 bg-nd-danger/10 text-nd-danger'
            }`}>
              {result.score}
            </div>
            <div>
              <Badge tone={scoreTone(result.score)}>{result.score >= 60 ? 'Pass' : 'Needs Review'}</Badge>
              <p className="mt-1 text-xs leading-5 text-nd-text-secondary">{result.feedback}</p>
            </div>
          </div>

          {/* Sample answer */}
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface/20 px-3 py-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-nd-text-muted/50">
              Sample answer
            </p>
            <p className="text-xs leading-5 text-nd-text-secondary">{task.sampleAnswer}</p>
          </div>

          {/* Next / Complete button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1.5 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-4 py-2 text-xs font-semibold text-nd-accent transition hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
            >
              {isLastTask ? 'View Results' : 'Next Task'}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
