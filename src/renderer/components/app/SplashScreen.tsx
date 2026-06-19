import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { BrandLogo } from "../primitives/BrandLogo";
import { Button } from "../primitives/Button";

const STARTUP_TASKS = [
  "Starting runtime…",
  "Loading config…",
  "Fetching personas…",
  "Loading themes…",
  "Indexing documents…",
  "Checking context stats…",
  "Initializing plugins…",
  "Ready.",
] as const;

const TASK_INTERVAL_MS = 280;
const SLOW_STARTUP_DELAY_MS = 5000;

interface SplashScreenProps {
  onOpenDiagnostics?: () => void;
  warning?: string | null;
  error?: string | null;
  onContinueAnyway?: () => void;
}

export function SplashScreen({
  onOpenDiagnostics,
  warning,
  error,
  onContinueAnyway,
}: SplashScreenProps) {
  const [taskIndex, setTaskIndex] = useState(0);
  const [showSlowStartup, setShowSlowStartup] = useState(false);
  const [fadeTask, setFadeTask] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = error
    ? taskIndex * (100 / STARTUP_TASKS.length)
    : Math.min(100, ((taskIndex + 1) / STARTUP_TASKS.length) * 100);

  useEffect(() => {
    if (error) return;

    intervalRef.current = setInterval(() => {
      setFadeTask(false);
      setTimeout(() => {
        setTaskIndex((i) => Math.min(i + 1, STARTUP_TASKS.length - 1));
        setFadeTask(true);
      }, 80);
    }, TASK_INTERVAL_MS);

    slowTimerRef.current = setTimeout(() => {
      setShowSlowStartup(true);
    }, SLOW_STARTUP_DELAY_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [error]);

  const currentTask = error
    ? error
    : STARTUP_TASKS[Math.min(taskIndex, STARTUP_TASKS.length - 1)];

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-nd-surface-app"
      aria-label="NEURODECK is loading"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex w-full max-w-xs flex-col items-center gap-6 rounded-2xl border border-nd-border-subtle bg-nd-surface-sidebar/40 p-8 shadow-2xl backdrop-blur-md"
        aria-label={error ? "Startup failed" : "Loading NEURODECK"}
      >
        <BrandLogo className="h-16 w-16" aria-hidden />

        <div className="w-full space-y-3 text-center">
          <h1 className="text-sm font-bold tracking-widest text-nd-text uppercase">NEURODECK</h1>

          {/* Task label with crossfade */}
          <p
            className="min-h-[1.25rem] text-xs text-nd-text-muted transition-opacity duration-75"
            style={{ opacity: fadeTask ? 1 : 0 }}
            aria-live="polite"
            aria-atomic="true"
          >
            {currentTask}
          </p>

          {/* Progress bar */}
          {error ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-nd-accent-error/30 bg-nd-accent-error/10 px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-nd-accent-error" aria-hidden />
              <p className="text-2xs text-nd-accent-error">{error}</p>
            </div>
          ) : (
            <div
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemax={100}
              aria-label="Startup progress"
              className="h-1 w-full overflow-hidden rounded-full bg-nd-surface-secondary"
            >
              <div
                className="h-full rounded-full bg-nd-accent transition-[width] duration-300 ease-out motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Startup warning chip */}
          {warning && (
            <div className="rounded-lg border border-nd-accent-warning/30 bg-nd-accent-warning/10 px-3 py-2">
              <p className="text-2xs text-nd-accent-warning">{warning}</p>
            </div>
          )}
        </div>

        {/* Action buttons (error state or slow startup) */}
        <div className="flex flex-col items-center gap-2">
          {error && (
            <>
              {onOpenDiagnostics && (
                <Button variant="secondary" size="sm" onClick={onOpenDiagnostics}>
                  Open Diagnostics
                </Button>
              )}
              {onContinueAnyway && (
                <Button variant="ghost" size="xs" onClick={onContinueAnyway}>
                  Continue anyway
                </Button>
              )}
            </>
          )}

          {!error && showSlowStartup && onOpenDiagnostics && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onOpenDiagnostics}
              className="animate-in fade-in"
            >
              Slow startup? Open Diagnostics
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
