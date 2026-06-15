import { useState, useId, useRef, KeyboardEvent } from "react";
import { X, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "../../../components/primitives/Badge";
import { Button } from "../../../components/primitives/Button";
import { MentorPanel } from "./MentorPanel";
import { gradeAlertAnalysis, alertScoreLabel, alertScoreTone } from "../utils/socGrading";
import type { SocAlert, AlertDisposition, AlertAnalysisState, AlertGradeResult } from "../types";

const DISPOSITION_OPTIONS: { value: AlertDisposition; label: string; description: string }[] = [
  {
    value: "true-positive",
    label: "True Positive",
    description: "Real malicious activity — escalate",
  },
  {
    value: "false-positive",
    label: "False Positive",
    description: "Benign activity — close alert",
  },
  { value: "benign", label: "Benign", description: "Expected activity — no action needed" },
];

interface AlertDetailPanelProps {
  alert: SocAlert;
  state: AlertAnalysisState;
  onChange: (next: AlertAnalysisState) => void;
}

export function AlertDetailPanel({ alert, state, onChange }: AlertDetailPanelProps) {
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const tagInputId = useId();
  const dispositionId = useId();
  const escalationId = useId();
  const tagInputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const tag = raw.trim().toUpperCase();
    if (!tag) return;
    if (!state.mitreTags.includes(tag)) {
      onChange({ ...state, mitreTags: [...state.mitreTags, tag] });
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    onChange({ ...state, mitreTags: state.mitreTags.filter((t) => t !== tag) });
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && tagInput === "" && state.mitreTags.length > 0) {
      removeTag(state.mitreTags[state.mitreTags.length - 1]);
    }
  }

  function submit() {
    if (!state.disposition) return;
    const result = gradeAlertAnalysis(
      alert,
      state.disposition,
      state.mitreTags,
      state.escalationNote
    );
    onChange({ ...state, graded: true, gradeResult: result });
  }

  const canSubmit = state.disposition !== "" && !state.graded;
  const isFP = alert.correctDisposition === "false-positive";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-nd-border-subtle px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-nd-text-primary">
              {alert.title}
            </p>
            <p className="mt-1 text-[11px] text-nd-text-muted/70">
              {new Date(alert.timestamp).toLocaleString()} &middot; {alert.source.toUpperCase()}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-nd-text-secondary">
          {alert.description}
        </p>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {/* Analyst Context */}
        <section>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
            Analyst Context
          </p>
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-base/60 px-3 py-2">
            <p className="text-[11px] leading-relaxed text-nd-text-secondary">{alert.context}</p>
          </div>
        </section>

        {/* Raw Logs (collapsible) */}
        <section>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60 transition hover:text-nd-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40"
            onClick={() => setLogsExpanded((v) => !v)}
            aria-expanded={logsExpanded}
          >
            <span>Raw Logs &amp; Evidence</span>
            {logsExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {logsExpanded && (
            <pre className="mt-1.5 overflow-x-auto whitespace-pre rounded-xl border border-nd-border-subtle bg-black/40 px-3 py-2 text-[10px] leading-5 text-nd-text-secondary font-mono">
              {alert.rawLogs}
            </pre>
          )}
          {!logsExpanded && (
            <p className="mt-1 text-[10px] italic text-nd-text-muted/50">
              Click to expand raw logs and evidence
            </p>
          )}
        </section>

        {/* Analysis form (only when not graded) */}
        {!state.graded && (
          <>
            {/* Disposition */}
            <section>
              <p
                id={dispositionId}
                className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60"
              >
                Disposition *
              </p>
              <div role="radiogroup" aria-labelledby={dispositionId} className="space-y-1.5">
                {DISPOSITION_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition ${
                      state.disposition === opt.value
                        ? "border-nd-accent-primary/40 bg-nd-accent-primary/10"
                        : "border-nd-border-subtle hover:border-nd-accent-primary/20 hover:bg-nd-surface/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`disp-${alert.id}`}
                      value={opt.value}
                      checked={state.disposition === opt.value}
                      onChange={() => onChange({ ...state, disposition: opt.value })}
                      className="mt-0.5 accent-nd-accent-primary"
                    />
                    <div>
                      <p className="text-[11px] font-medium text-nd-text-primary">{opt.label}</p>
                      <p className="text-[10px] text-nd-text-muted/60">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* MITRE tags */}
            {!isFP && (
              <section>
                <label
                  htmlFor={tagInputId}
                  className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60"
                >
                  MITRE ATT&amp;CK Techniques
                </label>
                <p className="mb-2 text-[10px] text-nd-text-muted/50">
                  Type a technique ID (e.g. T1059) and press Enter. Add as many as apply.
                </p>
                <div
                  className="flex min-h-[2.5rem] cursor-text flex-wrap items-center gap-1.5 rounded-xl border border-nd-border-subtle bg-nd-surface-base/60 px-2 py-1.5 focus-within:border-nd-accent-primary/40"
                  onClick={() => tagInputRef.current?.focus()}
                >
                  {state.mitreTags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-md bg-nd-accent-primary/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-nd-accent-primary"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(tag);
                        }}
                        aria-label={`Remove ${tag}`}
                        className="transition hover:text-nd-accent-error"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    id={tagInputId}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value.toUpperCase())}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => {
                      if (tagInput.trim()) addTag(tagInput);
                    }}
                    placeholder={state.mitreTags.length === 0 ? "T1059, T1027…" : ""}
                    className="min-w-[6rem] flex-1 bg-transparent text-[11px] text-nd-text-primary placeholder:text-nd-text-muted/30 focus:outline-none"
                  />
                </div>
              </section>
            )}

            {/* Escalation note */}
            <section>
              <label
                htmlFor={escalationId}
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60"
              >
                Escalation Note
              </label>
              <p className="mb-2 text-[10px] text-nd-text-muted/50">
                Summarize your findings. Describe what you observed and recommend an action.
              </p>
              <textarea
                id={escalationId}
                rows={4}
                value={state.escalationNote}
                onChange={(e) => onChange({ ...state, escalationNote: e.target.value })}
                placeholder="e.g. Encoded PowerShell execution observed on marketing endpoint. Recommend isolating host and escalating to Tier 2..."
                className="w-full resize-none rounded-xl border border-nd-border-subtle bg-nd-surface-base/60 px-3 py-2 text-[11px] text-nd-text-primary placeholder:text-nd-text-muted/30 focus:border-nd-accent-primary/40 focus:outline-none focus:ring-1 focus:ring-nd-accent-primary/20"
              />
            </section>
          </>
        )}

        {/* Grade display */}
        {state.graded && state.gradeResult && (
          <GradeDisplay result={state.gradeResult} alert={alert} />
        )}
      </div>

      {/* Submit bar */}
      {!state.graded && (
        <div className="shrink-0 border-t border-nd-border-subtle px-4 py-3">
          <Button size="md" variant="premium" fullWidth onClick={submit} disabled={!canSubmit}>
            Submit Analysis
          </Button>
          {!state.disposition && (
            <p className="mt-1.5 text-center text-[10px] text-nd-text-muted/50">
              Select a disposition to submit
            </p>
          )}
        </div>
      )}

      {/* Mentor panel — context omits correct answers; only observable evidence */}
      <MentorPanel
        context={[
          `Alert: ${alert.title}`,
          `Severity: ${alert.severity} | Source: ${alert.source}`,
          `Description: ${alert.description}`,
          `Analyst context: ${alert.context}`,
        ].join("\n")}
        greeting={`I'm here to help you think through this alert. What's your question?`}
      />
    </div>
  );
}

// ── Grade display ─────────────────────────────────────────────────────────────

interface GradeDisplayProps {
  result: AlertGradeResult;
  alert: SocAlert;
}

function GradeDisplay({ result, alert }: GradeDisplayProps) {
  const tone = alertScoreTone(result.score);

  const TONE_COLOR: Record<string, string> = {
    success: "text-nd-accent-success border-nd-accent-success/30 bg-nd-accent-success/10",
    accent: "text-nd-accent-primary border-nd-accent-primary/30 bg-nd-accent-primary/10",
    warning: "text-nd-accent-warning border-nd-accent-warning/30 bg-nd-accent-warning/10",
    danger: "text-nd-accent-error border-nd-accent-error/30 bg-nd-accent-error/10",
  };

  return (
    <section className="space-y-3">
      {/* Score banner */}
      <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${TONE_COLOR[tone]}`}>
        <div className="font-mono text-2xl font-bold leading-none">{result.score}</div>
        <div>
          <p className="text-[11px] font-semibold">{alertScoreLabel(result.score)}</p>
          <p className="text-[10px] opacity-70">{result.feedback}</p>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="divide-y divide-nd-border-subtle/40 rounded-xl border border-nd-border-subtle">
        <ScoreRow
          label="Disposition"
          earned={result.dispositionScore}
          max={50}
          correct={result.dispositionCorrect}
        />
        <ScoreRow
          label="MITRE Mapping"
          earned={result.mitreScore}
          max={25}
          correct={result.mitreMapped}
        />
        <ScoreRow
          label="Escalation Note"
          earned={result.escalationScore}
          max={25}
          correct={result.escalationScore >= 15}
        />
      </div>

      {/* Correct answers reveal */}
      <div className="space-y-2.5 rounded-xl border border-nd-border-subtle bg-nd-surface-base/40 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
          Correct Answer
        </p>

        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-[10px] text-nd-text-muted/60">Disposition</span>
          <Badge tone={alert.correctDisposition === "true-positive" ? "danger" : "success"}>
            {alert.correctDisposition.replace("-", " ")}
          </Badge>
        </div>

        {alert.correctMitreTechniques.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-24 shrink-0 text-[10px] text-nd-text-muted/60">MITRE</span>
            <div className="flex flex-wrap gap-1">
              {alert.correctMitreTechniques.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-nd-accent-primary/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-nd-accent-primary"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {alert.escalationKeywords.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-24 shrink-0 text-[10px] text-nd-text-muted/60">
              Key Terms
            </span>
            <p className="text-[10px] text-nd-text-secondary">
              {alert.escalationKeywords.join(", ")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ScoreRow({
  label,
  earned,
  max,
  correct,
}: {
  label: string;
  earned: number;
  max: number;
  correct: boolean;
}) {
  const Icon = correct ? CheckCircle2 : earned > 0 ? AlertTriangle : XCircle;
  const color = correct
    ? "text-nd-accent-success"
    : earned > 0
      ? "text-nd-accent-warning"
      : "text-nd-accent-error";

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} aria-hidden="true" />
      <span className="flex-1 text-[11px] text-nd-text-secondary">{label}</span>
      <span className="font-mono text-[11px] font-semibold text-nd-text-primary">
        {earned}/{max}
      </span>
    </div>
  );
}
