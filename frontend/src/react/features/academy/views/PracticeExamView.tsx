import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Timer, Play, Flag, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, BookOpen, RotateCcw, Award,
} from 'lucide-react';
import { Badge } from '../../../components/primitives/Badge';
import { EXAM_QUESTIONS, EXAM_DOMAINS, sampleQuestions } from '../data/examQuestions';
import type { ExamQuestion, ExamSession, ExamPhase } from '../types';

const QUESTION_COUNTS = [10, 20, 40, 60] as const;
const DEFAULT_MINUTES_PER_Q = 1.5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function domainScore(
  questions: ExamQuestion[],
  answers: Record<string, number>,
): Record<string, { correct: number; total: number }> {
  const result: Record<string, { correct: number; total: number }> = {};
  for (const q of questions) {
    if (!result[q.domain]) result[q.domain] = { correct: 0, total: 0 };
    result[q.domain].total++;
    if (answers[q.id] === q.correct) result[q.domain].correct++;
  }
  return result;
}

// ── Config screen ─────────────────────────────────────────────────────────────

function ExamConfig({ onStart }: { onStart: (count: number) => void }) {
  const [count, setCount] = useState<(typeof QUESTION_COUNTS)[number]>(20);
  const totalMinutes = Math.round(count * DEFAULT_MINUTES_PER_Q);

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-nd-accent/20 bg-nd-accent/10">
            <Award className="h-8 w-8 text-nd-accent" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-bold text-nd-text-primary">Security+ Practice Exam</h3>
          <p className="mt-1 text-sm text-nd-text-secondary">
            {EXAM_QUESTIONS.length} questions across 6 domains — randomized each attempt
          </p>
        </div>

        <div className="rounded-2xl border border-nd-border-subtle bg-nd-surface-base p-5 space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
              Number of Questions
            </p>
            <div className="grid grid-cols-4 gap-2">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`rounded-xl border py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                    count === n
                      ? 'border-nd-accent/40 bg-nd-accent/15 text-nd-accent'
                      : 'border-nd-border-subtle bg-nd-surface/40 text-nd-text-secondary hover:border-nd-accent/20'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl border border-nd-border-subtle bg-nd-surface/30 px-3 py-2.5">
              <p className="font-mono text-xl font-bold text-nd-text-primary">{count}</p>
              <p className="text-[10px] text-nd-text-muted/60">Questions</p>
            </div>
            <div className="rounded-xl border border-nd-border-subtle bg-nd-surface/30 px-3 py-2.5">
              <p className="font-mono text-xl font-bold text-nd-text-primary">{totalMinutes}</p>
              <p className="text-[10px] text-nd-text-muted/60">Minutes</p>
            </div>
          </div>

          <div className="rounded-xl border border-nd-border-subtle/50 bg-nd-surface/20 px-3 py-2.5 space-y-1">
            {EXAM_DOMAINS.map((d) => (
              <div key={d} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-nd-accent/60 shrink-0" aria-hidden="true" />
                <span className="text-[11px] text-nd-text-secondary">{d}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onStart(count)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-nd-accent/30 bg-nd-accent/15 px-5 py-3 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          Start Exam
        </button>
      </div>
    </div>
  );
}

// ── Option button ─────────────────────────────────────────────────────────────

function OptionButton({
  letter, text, selected, onSelect, disabled,
}: {
  letter: string; text: string; selected: boolean; onSelect: () => void; disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
        selected
          ? 'border-nd-accent/50 bg-nd-accent/15 text-nd-text-primary'
          : 'border-nd-border-subtle bg-nd-surface/20 text-nd-text-secondary hover:border-nd-accent/20 hover:bg-nd-surface/40'
      } disabled:cursor-not-allowed`}
    >
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
        selected ? 'border-nd-accent bg-nd-accent text-black' : 'border-nd-border-subtle text-nd-text-muted/60'
      }`}>
        {letter}
      </span>
      <span className="leading-relaxed">{text}</span>
    </button>
  );
}

// ── Active exam screen ────────────────────────────────────────────────────────

function ExamRunner({
  session,
  questions,
  onAnswer,
  onFlag,
  onNavigate,
  onFinish,
}: {
  session: ExamSession;
  questions: ExamQuestion[];
  onAnswer: (qId: string, idx: number) => void;
  onFlag: (qId: string) => void;
  onNavigate: (idx: number) => void;
  onFinish: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const remaining = session.timeLimitSeconds - elapsed;
  const timerWarning = remaining < 120;
  const q = questions[activeIdx];
  const answered = Object.keys(session.answers).length;
  const unanswered = questions.length - answered;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= session.timeLimitSeconds) {
          clearInterval(intervalRef.current!);
          onFinish();
          return session.timeLimitSeconds;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [session.timeLimitSeconds, onFinish]);

  function goTo(idx: number) {
    const clamped = Math.max(0, Math.min(questions.length - 1, idx));
    setActiveIdx(clamped);
    onNavigate(clamped);
  }

  if (!q) return null;

  const isFlagged = session.flagged.has(q.id);
  const currentAnswer = session.answers[q.id] ?? -1;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 border-b border-nd-border-subtle px-4 py-2.5 bg-nd-surface-base/60">
        <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-sm font-bold ${
          timerWarning
            ? 'border-nd-danger/40 bg-nd-danger/10 text-nd-danger'
            : 'border-nd-border-subtle text-nd-text-primary'
        }`}>
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          {formatTime(Math.max(0, remaining))}
        </div>
        <div className="flex-1" />
        <span className="text-[11px] text-nd-text-muted/60">
          {answered}/{questions.length} answered
        </span>
        <button
          type="button"
          onClick={() => setConfirmFinish(true)}
          className="rounded-lg border border-nd-border-subtle px-3 py-1.5 text-[11px] font-medium text-nd-text-secondary transition hover:border-nd-accent/30 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          Finish Exam
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Question header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/50 mb-1">
                  Q{activeIdx + 1} of {questions.length} — {q.domain}
                </p>
                <p className="text-sm leading-relaxed text-nd-text-primary font-medium">{q.stem}</p>
              </div>
              <button
                type="button"
                onClick={() => onFlag(q.id)}
                aria-label={isFlagged ? 'Remove flag from question' : 'Flag question for review'}
                aria-pressed={isFlagged}
                className={`shrink-0 rounded-lg border p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                  isFlagged
                    ? 'border-nd-warning/40 bg-nd-warning/15 text-nd-warning'
                    : 'border-nd-border-subtle text-nd-text-muted/40 hover:border-nd-warning/30'
                }`}
              >
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-2.5" role="radiogroup" aria-label={`Options for question ${activeIdx + 1}`}>
              {q.options.map((opt, i) => (
                <OptionButton
                  key={i}
                  letter={String.fromCharCode(65 + i)}
                  text={opt}
                  selected={currentAnswer === i}
                  onSelect={() => onAnswer(q.id, i)}
                  disabled={false}
                />
              ))}
            </div>
          </div>

          {/* Prev / Next nav */}
          <div className="shrink-0 flex items-center justify-between border-t border-nd-border-subtle bg-nd-surface-base/40 px-5 py-3">
            <button
              type="button"
              onClick={() => goTo(activeIdx - 1)}
              disabled={activeIdx === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-nd-border-subtle px-3 py-1.5 text-[11px] text-nd-text-secondary transition hover:border-nd-accent/20 hover:text-nd-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Previous
            </button>
            <span className="font-mono text-[11px] text-nd-text-muted/50">{activeIdx + 1}/{questions.length}</span>
            {activeIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => goTo(activeIdx + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-nd-border-subtle px-3 py-1.5 text-[11px] text-nd-text-secondary transition hover:border-nd-accent/20 hover:text-nd-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmFinish(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-nd-accent/30 bg-nd-accent/10 px-3 py-1.5 text-[11px] font-semibold text-nd-accent transition hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
              >
                Finish
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Question navigator sidebar */}
        <aside className="w-44 shrink-0 border-l border-nd-border-subtle bg-nd-surface-base/30 overflow-y-auto p-2" aria-label="Question navigator">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/50">Navigator</p>
          <div className="grid grid-cols-5 gap-1" role="group" aria-label="Jump to question">
            {questions.map((question, i) => {
              const isAnswered = session.answers[question.id] !== undefined;
              const isFlaggedQ = session.flagged.has(question.id);
              const isActive = i === activeIdx;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Question ${i + 1}${isAnswered ? ', answered' : ''}${isFlaggedQ ? ', flagged' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 ${
                    isActive
                      ? 'bg-nd-accent text-black'
                      : isFlaggedQ
                      ? 'border border-nd-warning/50 bg-nd-warning/10 text-nd-warning'
                      : isAnswered
                      ? 'bg-nd-surface/60 text-nd-text-primary'
                      : 'border border-nd-border-subtle/50 text-nd-text-muted/40'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 px-1">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-nd-surface/60 border border-nd-border-subtle" aria-hidden="true" />
              <span className="text-[9px] text-nd-text-muted/50">Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm border border-nd-warning/50 bg-nd-warning/10" aria-hidden="true" />
              <span className="text-[9px] text-nd-text-muted/50">Flagged</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm border border-nd-border-subtle/50" aria-hidden="true" />
              <span className="text-[9px] text-nd-text-muted/50">Unanswered</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Finish confirmation dialog */}
      {confirmFinish && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="finish-dialog-title"
          className="absolute inset-0 z-20 flex items-center justify-center bg-nd-surface-base/80 backdrop-blur-sm"
        >
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-nd-border-subtle bg-nd-surface-base p-6 shadow-xl space-y-4">
            <p id="finish-dialog-title" className="text-base font-bold text-nd-text-primary">Submit exam?</p>
            <p className="text-sm text-nd-text-secondary">
              You have {unanswered > 0 ? `${unanswered} unanswered question${unanswered !== 1 ? 's' : ''}` : 'answered all questions'}.
              {unanswered > 0 && ' Unanswered questions will be marked incorrect.'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmFinish(false)}
                className="flex-1 rounded-xl border border-nd-border-subtle bg-nd-surface/40 px-4 py-2 text-sm font-medium text-nd-text-secondary transition hover:text-nd-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
              >
                Keep reviewing
              </button>
              <button
                type="button"
                onClick={() => { setConfirmFinish(false); onFinish(); }}
                className="flex-1 rounded-xl border border-nd-accent/30 bg-nd-accent/15 px-4 py-2 text-sm font-bold text-nd-accent transition hover:bg-nd-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Review screen ─────────────────────────────────────────────────────────────

function ExamReview({
  questions,
  session,
  onReset,
}: {
  questions: ExamQuestion[];
  session: ExamSession;
  onReset: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'wrong' | 'flagged'>('all');

  const correct = questions.filter((q) => session.answers[q.id] === q.correct).length;
  const percent = Math.round((correct / questions.length) * 100);
  const passed = percent >= 75;
  const domains = domainScore(questions, session.answers);

  const durationSeconds = session.finishedAt
    ? Math.round((session.finishedAt - session.startedAt) / 1000)
    : session.timeLimitSeconds;

  const filtered = questions.filter((q) => {
    if (filter === 'wrong') return session.answers[q.id] !== q.correct;
    if (filter === 'flagged') return session.flagged.has(q.id);
    return true;
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Summary header */}
      <div className={`shrink-0 border-b border-nd-border-subtle px-5 py-4 ${passed ? 'bg-nd-success/[0.04]' : 'bg-nd-warning/[0.04]'}`}>
        <div className="flex items-center gap-5">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border font-mono text-2xl font-bold ${
            passed ? 'border-nd-success/30 bg-nd-success/10 text-nd-success' : 'border-nd-warning/30 bg-nd-warning/10 text-nd-warning'
          }`}>
            {percent}%
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-nd-text-primary">
              {passed ? 'Passing Score' : 'Needs More Study'}
              <span className="ml-2 text-nd-text-muted/60 font-normal">
                {correct}/{questions.length} correct
              </span>
            </p>
            <p className="text-[11px] text-nd-text-secondary mt-0.5">
              Time used: {formatTime(durationSeconds)} · Flagged: {session.flagged.size}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5">
              {Object.entries(domains).map(([domain, { correct: c, total: t }]) => (
                <div key={domain} className="flex items-center gap-1.5">
                  <div className="flex-1 h-1 overflow-hidden rounded-full bg-nd-surface/60">
                    <div
                      className={`h-full rounded-full ${c / t >= 0.75 ? 'bg-nd-success' : c / t >= 0.5 ? 'bg-nd-warning' : 'bg-nd-danger'}`}
                      style={{ width: `${Math.round((c / t) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-nd-text-muted/60 tabular-nums">{c}/{t}</span>
                  <span className="text-[9px] text-nd-text-muted/50 truncate max-w-[80px]" title={domain}>
                    {domain.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-nd-border-subtle px-3 py-2 text-[11px] font-medium text-nd-text-secondary transition hover:border-nd-accent/30 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Retake
          </button>
        </div>

        {/* Filter bar */}
        <div className="mt-3 flex gap-1.5">
          {(['all', 'wrong', 'flagged'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium capitalize transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 ${
                filter === f
                  ? 'border-nd-accent/40 bg-nd-accent/15 text-nd-accent'
                  : 'border-nd-border-subtle text-nd-text-muted/60 hover:text-nd-text-secondary'
              }`}
            >
              {f === 'all' ? `All (${questions.length})` : f === 'wrong' ? `Incorrect (${questions.length - correct})` : `Flagged (${session.flagged.size})`}
            </button>
          ))}
        </div>
      </div>

      {/* Question review list */}
      <div className="flex-1 overflow-y-auto divide-y divide-nd-border-subtle/30">
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm text-nd-text-muted/40">
            No questions match this filter
          </div>
        )}
        {filtered.map((q) => {
          const userAnswer = session.answers[q.id] ?? -1;
          const isCorrect = userAnswer === q.correct;
          const expanded = expandedId === q.id;

          return (
            <div key={q.id}>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : q.id)}
                aria-expanded={expanded}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-nd-surface/10 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 focus-visible:ring-inset"
              >
                {isCorrect
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-nd-success shrink-0" aria-label="Correct" />
                  : <XCircle className="mt-0.5 h-4 w-4 text-nd-danger shrink-0" aria-label="Incorrect" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-nd-text-muted/50 mb-0.5">{q.domain}</p>
                  <p className="text-[12px] text-nd-text-secondary leading-relaxed">{q.stem}</p>
                  {!expanded && (
                    <p className={`mt-1 text-[11px] font-medium ${isCorrect ? 'text-nd-success' : 'text-nd-danger'}`}>
                      {isCorrect ? `✓ ${q.options[q.correct]}` : `✗ You chose: ${userAnswer >= 0 ? q.options[userAnswer] : 'Unanswered'}`}
                    </p>
                  )}
                </div>
                {session.flagged.has(q.id) && (
                  <Badge tone="warning">Flagged</Badge>
                )}
              </button>

              {expanded && (
                <div className="mx-4 mb-3 space-y-2 rounded-xl border border-nd-border-subtle bg-nd-surface-base/40 p-4">
                  {q.options.map((opt, idx) => {
                    const isUserChoice = userAnswer === idx;
                    const isCorrectOpt = q.correct === idx;
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${
                          isCorrectOpt
                            ? 'border-nd-success/40 bg-nd-success/10 text-nd-text-primary'
                            : isUserChoice
                            ? 'border-nd-danger/40 bg-nd-danger/10 text-nd-text-primary'
                            : 'border-nd-border-subtle/50 text-nd-text-muted/60'
                        }`}
                      >
                        <span className="shrink-0 font-bold w-4">{String.fromCharCode(65 + idx)}.</span>
                        <span className="flex-1">{opt}</span>
                        {isCorrectOpt && <CheckCircle2 className="shrink-0 h-4 w-4 text-nd-success mt-0.5" aria-hidden="true" />}
                        {isUserChoice && !isCorrectOpt && <XCircle className="shrink-0 h-4 w-4 text-nd-danger mt-0.5" aria-hidden="true" />}
                      </div>
                    );
                  })}
                  <div className="rounded-lg border border-nd-border-subtle/50 bg-nd-surface/20 px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen className="h-3 w-3 text-nd-text-muted/50" aria-hidden="true" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted/50">Explanation</span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-nd-text-secondary">{q.explanation}</p>
                    {q.mitreTechnique && (
                      <Badge tone="warning" className="mt-2">{q.mitreTechnique}</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Root view ─────────────────────────────────────────────────────────────────

export function PracticeExamView() {
  const [phase, setPhase] = useState<ExamPhase>('config');
  const [session, setSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const seed = useRef(Date.now());

  const handleStart = useCallback((count: number) => {
    seed.current = Date.now();
    const qs = sampleQuestions(count, seed.current);
    const newSession: ExamSession = {
      questionIds: qs.map((q) => q.id),
      answers: {},
      flagged: new Set(),
      startedAt: Date.now(),
      timeLimitSeconds: Math.round(count * DEFAULT_MINUTES_PER_Q * 60),
    };
    setQuestions(qs);
    setSession(newSession);
    setPhase('running');
  }, []);

  const handleAnswer = useCallback((qId: string, idx: number) => {
    setSession((s) => s ? { ...s, answers: { ...s.answers, [qId]: idx } } : s);
  }, []);

  const handleFlag = useCallback((qId: string) => {
    setSession((s) => {
      if (!s) return s;
      const next = new Set(s.flagged);
      if (next.has(qId)) next.delete(qId); else next.add(qId);
      return { ...s, flagged: next };
    });
  }, []);

  const handleFinish = useCallback(() => {
    setSession((s) => s ? { ...s, finishedAt: Date.now() } : s);
    setPhase('review');
  }, []);

  const handleReset = useCallback(() => {
    setPhase('config');
    setSession(null);
    setQuestions([]);
  }, []);

  if (phase === 'config') return <ExamConfig onStart={handleStart} />;
  if (phase === 'running' && session) {
    return (
      <ExamRunner
        session={session}
        questions={questions}
        onAnswer={handleAnswer}
        onFlag={handleFlag}
        onNavigate={() => {}}
        onFinish={handleFinish}
      />
    );
  }
  if (phase === 'review' && session) {
    return (
      <ExamReview
        questions={questions}
        session={session}
        onReset={handleReset}
      />
    );
  }
  return null;
}
