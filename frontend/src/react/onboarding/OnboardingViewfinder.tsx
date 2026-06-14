import { useEffect, useMemo, useState } from "react";
import type { OnboardingAnchor, OnboardingStep } from "./onboarding.types";

type Rect = { top: number; left: number; width: number; height: number };

type Props = {
  step: OnboardingStep;
  anchors: OnboardingAnchor[];
  noDim?: boolean;
};

function readRect(selector?: string): Rect | null {
  if (!selector) return null;
  const target = document.querySelector<HTMLElement>(selector);
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    top: Math.max(8, rect.top - 8),
    left: Math.max(8, rect.left - 8),
    width: rect.width + 16,
    height: rect.height + 16,
  };
}

export function OnboardingViewfinder({ step, anchors, noDim }: Props) {
  const anchor = anchors.find((item) => item.id === step.anchorId);
  const [rect, setRect] = useState<Rect | null>(() => readRect(anchor?.selector));
  const fallbackLabel = anchor?.fallbackLabel ?? "current screen";

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setRect(readRect(anchor?.selector)));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchor?.selector]);

  const style = useMemo(() => {
    if (!rect) return undefined;
    return {
      transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    };
  }, [rect]);

  return (
    <div className={`onboarding-viewfinder-layer ${noDim ? "no-dim" : ""}`} aria-hidden="true">
      {!noDim && <div className="onboarding-viewfinder-dim" />}
      {rect ? (
        <div className={`onboarding-viewfinder-frame ${step.viewfinderType}`} style={style} />
      ) : (
        <div className="onboarding-viewfinder-fallback">
          <span>{fallbackLabel}</span>
        </div>
      )}
    </div>
  );
}
