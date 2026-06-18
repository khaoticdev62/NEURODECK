import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "../primitives/Button";
import { ConfirmDialog } from "../primitives/ConfirmDialog";
import { FocusTrapContainer } from "../primitives/FocusTrapContainer";

interface TutorialStep {
  target: string;
  title: string;
  body: string;
}

interface Tutorial {
  id: string;
  name: string;
  steps: TutorialStep[];
}

interface TutorialOverlayProps {
  tutorial: Tutorial | null;
  onComplete: (id: string) => void;
  onDismiss: () => void;
}

const STORAGE_KEY = "nd:completed-tutorials";

function getCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markComplete(id: string) {
  const done = getCompleted();
  done.add(id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]));
  } catch {
    // storage unavailable
  }
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getTargetRect(selector: string): SpotlightRect | null {
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  } catch {
    return null;
  }
}

function SpotlightOverlay({ rect }: { rect: SpotlightRect | null }) {
  const pad = 8;
  if (!rect) {
    return (
      <div
        className="fixed inset-0 z-[200]"
        style={{ background: "rgba(0,0,0,0.75)" }}
        aria-hidden
      />
    );
  }
  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[200]"
      width="100%"
      height="100%"
      aria-hidden
    >
      <defs>
        <mask id="nd-tutorial-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={rect.left - pad}
            y={rect.top - pad}
            width={rect.width + pad * 2}
            height={rect.height + pad * 2}
            rx={8}
            ry={8}
            fill="black"
          />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.75)"
        mask="url(#nd-tutorial-mask)"
      />
      <rect
        x={rect.left - pad}
        y={rect.top - pad}
        width={rect.width + pad * 2}
        height={rect.height + pad * 2}
        rx={8}
        ry={8}
        fill="none"
        stroke="var(--nd-accent-primary)"
        strokeWidth="2"
        strokeDasharray="6 3"
        opacity="0.8"
      />
    </svg>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function TutorialOverlay({ tutorial, onComplete, onDismiss }: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const step = tutorial?.steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = tutorial ? stepIndex === tutorial.steps.length - 1 : false;

  useEffect(() => {
    if (!step) return;
    const r = getTargetRect(step.target);
    setRect(r);
    // Re-measure on resize
    const handler = () => setRect(getTargetRect(step.target));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [step]);

  useEffect(() => {
    if (!tutorial) return;
    // Keyboard: Right/ArrowRight = next, Left = back, Escape = skip prompt
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && !isLast) setStepIndex((i) => i + 1);
      if (e.key === "ArrowLeft" && !isFirst) setStepIndex((i) => i - 1);
      if (e.key === "Escape") setShowSkipConfirm(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tutorial, isFirst, isLast]);

  const handleNext = useCallback(() => {
    if (isLast) {
      markComplete(tutorial!.id);
      onComplete(tutorial!.id);
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [isLast, tutorial, onComplete]);

  const handleBack = () => setStepIndex((i) => i - 1);

  const handleSkip = () => {
    onDismiss();
  };

  if (!tutorial || !step) return null;

  // Compute bubble placement: below the spotlight, or top if near bottom
  const BUBBLE_GAP = 16;
  const PAD = 8;
  const bubbleStyle: React.CSSProperties = { position: "fixed", zIndex: 210 };
  if (rect) {
    const bottom = rect.top + rect.height + PAD;
    if (bottom + 200 < window.innerHeight) {
      bubbleStyle.top = bottom + BUBBLE_GAP;
      bubbleStyle.left = Math.max(16, rect.left);
    } else {
      bubbleStyle.bottom = window.innerHeight - (rect.top - PAD) + BUBBLE_GAP;
      bubbleStyle.left = Math.max(16, rect.left);
    }
    bubbleStyle.maxWidth = `calc(100vw - 32px)`;
    bubbleStyle.width = Math.min(360, window.innerWidth - 32);
  } else {
    bubbleStyle.top = "50%";
    bubbleStyle.left = "50%";
    bubbleStyle.transform = "translate(-50%, -50%)";
    bubbleStyle.width = 360;
  }

  return (
    <>
      <SpotlightOverlay rect={reducedMotion ? null : rect} />

      <FocusTrapContainer active>
        {/* Step bubble */}
        <div
          ref={bubbleRef}
          role="dialog"
          aria-modal="false"
          aria-label={`Tutorial: ${step.title}`}
          aria-live="polite"
          style={bubbleStyle}
          className="rounded-2xl border border-nd-accent-primary/30 bg-nd-surface-secondary/95 p-5 shadow-2xl backdrop-blur"
        >
          {/* Step count */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-nd-accent-primary">
              {tutorial.name}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-nd-text-muted">
                {stepIndex + 1} / {tutorial.steps.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={() => setShowSkipConfirm(true)}
                aria-label="Skip tutorial"
              />
            </div>
          </div>

          {/* Content */}
          <h2 className="mb-1 text-base font-black text-nd-text-primary">{step.title}</h2>
          <p className="text-sm text-nd-text-secondary">{step.body}</p>

          {/* Progress dots */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex gap-1" aria-label="Step progress" role="list">
              {tutorial.steps.map((_, i) => (
                <span
                  key={i}
                  role="listitem"
                  aria-current={i === stepIndex ? "step" : undefined}
                  className={`block h-1.5 w-1.5 rounded-full transition ${
                    i === stepIndex ? "bg-nd-accent-primary" : i < stepIndex ? "bg-nd-accent-primary/40" : "bg-nd-border-subtle"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {!isFirst && (
                <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={handleBack}>
                  Back
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleNext}>
                {isLast ? "Finish" : (
                  <>
                    Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </FocusTrapContainer>

      <ConfirmDialog
        open={showSkipConfirm}
        title="Skip Tutorial"
        message={`Skip "${tutorial.name}"? You can replay it from the Feature Tours screen.`}
        confirmLabel="Skip"
        cancelLabel="Keep Going"
        onConfirm={() => { setShowSkipConfirm(false); handleSkip(); }}
        onCancel={() => setShowSkipConfirm(false)}
      />
    </>
  );
}

export { getCompleted as getTutorialCompleted, markComplete as markTutorialComplete };
export type { Tutorial, TutorialStep };
