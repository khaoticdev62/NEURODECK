import { useEffect, useMemo, useState, type Dispatch } from "react";
import { ArrowLeft, ArrowRight, Check, Gauge, MonitorPlay, Sparkles, X } from "lucide-react";
import { useControllerAction } from "../input/controller/useControllerAction";
import type { NeuroDeckAction, NeuroDeckState } from "../types/neurodeck";
import { OnboardingAnimationPanel } from "./OnboardingAnimation";
import {
  getCoreOnboardingManifests,
  buildOnboardingSteps,
} from "./OnboardingRegistry";
import {
  loadOnboardingProgress,
  markLegacyOnboardingComplete,
  saveOnboardingProgress,
} from "./OnboardingProgressStore";
import { OnboardingViewfinder } from "./OnboardingViewfinder";
import type { OnboardingMode, OnboardingProgressState } from "./onboarding.types";

type Props = {
  mode: Exclude<OnboardingMode, "setup">;
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
};

export function OnboardingOverlay({ mode, state, dispatch }: Props) {
  const [progress, setProgress] = useState<OnboardingProgressState | null>(null);
  const [index, setIndex] = useState(0);
  const manifests = useMemo(() => getCoreOnboardingManifests(), []);
  const steps = useMemo(() => buildOnboardingSteps({ mode, state, activeView: state.activeView }), [mode, state]);
  const step = steps[Math.min(index, Math.max(0, steps.length - 1))];
  const anchors = useMemo(() => manifests.flatMap((manifest) => manifest.anchors), [manifests]);

  useEffect(() => {
    let mounted = true;
    loadOnboardingProgress().then((loaded) => {
      if (!mounted) return;
      setProgress(loaded);
      const lastIndex = loaded.lastActiveStepId ? steps.findIndex((item) => item.id === loaded.lastActiveStepId) : -1;
      if (lastIndex >= 0) setIndex(lastIndex);
    });
    return () => {
      mounted = false;
    };
  }, [steps]);

  const persist = async (next: Partial<OnboardingProgressState>) => {
    if (!progress) return;
    const merged = {
      ...progress,
      ...next,
      lastSeenManifestVersions: {
        ...progress.lastSeenManifestVersions,
        ...Object.fromEntries(manifests.map((manifest) => [manifest.featureId, manifest.version])),
      },
      lastUpdatedAt: new Date().toISOString(),
    };
    setProgress(merged);
    await saveOnboardingProgress(merged);
  };

  const close = async () => {
    await markLegacyOnboardingComplete();
    dispatch({ type: "close-onboarding" });
  };

  const completeCurrent = async () => {
    if (!step || !progress) return;
    await persist({
      completedStepIds: Array.from(new Set([...progress.completedStepIds, step.id])),
      lastActiveStepId: steps[index + 1]?.id,
    });
    if (index >= steps.length - 1) {
      await close();
    } else {
      setIndex((value) => value + 1);
    }
  };

  const skipCurrent = async () => {
    if (!step || !progress) return;
    await persist({
      skippedStepIds: Array.from(new Set([...progress.skippedStepIds, step.id])),
      lastActiveStepId: steps[index + 1]?.id,
    });
    if (index >= steps.length - 1) {
      await close();
    } else {
      setIndex((value) => value + 1);
    }
  };

  const setMotionMode = async (motionMode: OnboardingProgressState["motionMode"]) => {
    await persist({ motionMode });
  };

  const setFidelityMode = async (fidelityMode: OnboardingProgressState["fidelityMode"]) => {
    await persist({ fidelityMode });
  };

  useControllerAction("back", () => {
    if (index > 0) setIndex((value) => value - 1);
    else void close();
    return true;
  }, true);

  useControllerAction("cancel", () => {
    void close();
    return true;
  }, true);

  useControllerAction("confirm", () => {
    void completeCurrent();
    return true;
  }, true);

  if (!step || !progress) return null;

  const rich = progress.fidelityMode === "rich";
  const motionOff = progress.motionMode !== "full";

  return (
    <div
      className={`onboarding-tour-root ${rich ? "rich" : "deck-safe"} ${motionOff ? "motion-off" : ""}`}
      data-controller-overlay="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tour-title"
    >
      <OnboardingViewfinder step={step} anchors={anchors} noDim={progress.fidelityMode === "deck_safe"} />
      <section className="onboarding-tour-card no-drag">
        <header className="flex items-start justify-between gap-4 border-b border-nd-text-muted/15 p-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-nd-accent/20 bg-nd-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-nd-accent">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {mode === "contextual" ? "Show Me This" : mode === "whats-new" ? "What's New" : "Guided Tour"}
            </div>
            <h2 id="onboarding-tour-title" className="text-lg font-bold text-nd-text">
              {step.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-nd-text-muted">{step.jpeText}</p>
          </div>
          <button
            type="button"
            onClick={() => void close()}
            className="rounded-xl border border-nd-text-muted/15 p-2 text-nd-text-muted hover:text-nd-text"
            aria-label="Close onboarding"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <OnboardingAnimationPanel
              animation={step.animation}
              motionMode={progress.motionMode}
              fidelityMode={progress.fidelityMode}
            />
            {step.safetyNote && (
              <div className="mt-3 rounded-2xl border border-nd-warning/25 bg-nd-warning/10 p-3 text-xs leading-5 text-nd-text">
                {step.safetyNote}
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/35 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-nd-text-muted">
                <MonitorPlay className="h-4 w-4 text-nd-accent" />
                Inputs
              </div>
              <div className="space-y-2">
                {step.inputHints.map((hint) => (
                  <div key={`${hint.device}-${hint.input}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-nd-text-muted">{hint.action}</span>
                    <kbd className="rounded border border-nd-text-muted/15 bg-nd-bg/60 px-2 py-0.5 font-mono text-nd-accent">
                      {hint.input}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/35 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-nd-text-muted">
                <Gauge className="h-4 w-4 text-nd-accent" />
                Media Policy
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void setFidelityMode("deck_safe")} className={policyClass(!rich)}>
                  Deck Safe
                </button>
                <button type="button" onClick={() => void setFidelityMode("rich")} className={policyClass(rich)}>
                  Rich
                </button>
                <button type="button" onClick={() => void setMotionMode("full")} className={policyClass(progress.motionMode === "full")}>
                  Motion
                </button>
                <button type="button" onClick={() => void setMotionMode("none")} className={policyClass(progress.motionMode === "none")}>
                  No Motion
                </button>
              </div>
            </div>
          </aside>
        </div>

        <footer className="flex items-center justify-between border-t border-nd-text-muted/15 p-4">
          <div className="text-xs text-nd-text-muted">
            Step {index + 1} / {steps.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-nd-text-muted/15 px-4 text-xs text-nd-text-muted disabled:opacity-40"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            {step.skippable && (
              <button
                type="button"
                onClick={() => void skipCurrent()}
                className="inline-flex h-9 items-center rounded-xl border border-nd-text-muted/15 px-4 text-xs text-nd-text-muted"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              onClick={() => void completeCurrent()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-nd-accent px-5 text-xs font-bold text-nd-bg"
            >
              {index >= steps.length - 1 ? <Check className="h-4 w-4" /> : null}
              {index >= steps.length - 1 ? "Finish" : "Next"}
              {index < steps.length - 1 ? <ArrowRight className="h-3.5 w-3.5" /> : null}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function policyClass(active: boolean) {
  return `rounded-lg border px-2 py-1.5 text-xs transition ${
    active
      ? "border-nd-accent/35 bg-nd-accent/10 text-nd-accent"
      : "border-nd-text-muted/15 text-nd-text-muted hover:text-nd-text"
  }`;
}
