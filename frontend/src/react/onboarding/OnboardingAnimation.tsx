import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { getOnboardingLottieSample } from "./OnboardingRegistry";
import type { OnboardingAnimation, OnboardingFidelityMode, OnboardingMotionMode } from "./onboarding.types";

type Props = {
  animation?: OnboardingAnimation;
  motionMode: OnboardingMotionMode;
  fidelityMode: OnboardingFidelityMode;
};

function shouldUseRich(animation: OnboardingAnimation | undefined, motionMode: OnboardingMotionMode, fidelityMode: OnboardingFidelityMode) {
  if (!animation) return false;
  if (motionMode !== "full") return false;
  if (!animation.requiresRichMedia) return true;
  return fidelityMode === "rich";
}

export function OnboardingAnimationPanel({ animation, motionMode, fidelityMode }: Props) {
  const lottieRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState(false);
  const rich = shouldUseRich(animation, motionMode, fidelityMode);

  useEffect(() => {
    let destroyed = false;
    let lottieInstance: { destroy: () => void; pause?: () => void; play?: () => void } | null = null;
    if (!animation || animation.type !== "lottie" || !rich || !lottieRef.current) return;

    void import("lottie-web")
      .then((module) => {
        if (destroyed || !lottieRef.current) return;
        lottieInstance = module.default.loadAnimation({
          container: lottieRef.current,
          renderer: "svg",
          loop: animation.loop ?? true,
          autoplay: playing,
          animationData: animation.src === "local:lottie-signal" ? getOnboardingLottieSample() : undefined,
          path: animation.src !== "local:lottie-signal" ? animation.src : undefined,
        });
      })
      .catch(() => setFailed(true));

    return () => {
      destroyed = true;
      lottieInstance?.destroy();
    };
  }, [animation, playing, rich]);

  if (!animation) return null;

  const caption = (
    <p className="mt-3 text-xs leading-5 text-nd-text-muted" id="onboarding-animation-caption">
      {animation.caption}
    </p>
  );

  if (!rich || failed || animation.type === "static" || animation.type === "svg") {
    return (
      <figure className="onboarding-media-panel rounded-2xl border border-nd-text-muted/15 bg-nd-surface/35 p-3">
        <img
          src={animation.fallbackSrc}
          alt=""
          className="h-36 w-full rounded-xl object-cover"
          aria-describedby="onboarding-animation-caption"
        />
        {caption}
      </figure>
    );
  }

  if (animation.type === "lottie") {
    return (
      <figure className="onboarding-media-panel rounded-2xl border border-nd-accent/20 bg-nd-surface/35 p-3">
        <div ref={lottieRef} className="h-36 w-full overflow-hidden rounded-xl bg-nd-bg/40" />
        {caption}
        <MediaControls playing={playing} onToggle={() => setPlaying((value) => !value)} />
      </figure>
    );
  }

  if (animation.type === "webm") {
    return (
      <figure className="onboarding-media-panel rounded-2xl border border-nd-accent/20 bg-nd-surface/35 p-3">
        <video
          className="h-36 w-full rounded-xl object-cover"
          poster={animation.fallbackSrc}
          src={animation.src}
          muted
          playsInline
          loop={animation.loop}
          autoPlay={playing}
          onError={() => setFailed(true)}
          aria-describedby="onboarding-animation-caption"
        />
        {caption}
        <MediaControls playing={playing} onToggle={() => setPlaying((value) => !value)} />
      </figure>
    );
  }

  if (animation.type === "audio") {
    return (
      <figure className="onboarding-media-panel rounded-2xl border border-nd-accent/20 bg-nd-surface/35 p-3">
        <div className="flex h-36 items-center justify-center rounded-xl border border-nd-text-muted/10 bg-nd-bg/50">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-4 py-2 text-sm font-semibold text-nd-accent"
            onClick={() => void audioRef.current?.play()}
          >
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            Play captioned audio cue
          </button>
          <audio ref={audioRef} src={animation.src} preload="none" />
        </div>
        {caption}
      </figure>
    );
  }

  if (animation.type === "shader") {
    return (
      <figure className="onboarding-media-panel rounded-2xl border border-nd-accent/20 bg-nd-surface/35 p-3">
        <div className="onboarding-shader-sample h-36 rounded-xl" aria-hidden="true" />
        {caption}
      </figure>
    );
  }

  return (
    <figure className="onboarding-media-panel rounded-2xl border border-nd-accent/20 bg-nd-surface/35 p-3">
      <div className="onboarding-css-demo h-36 rounded-xl" aria-hidden="true">
        <span />
      </div>
      {caption}
    </figure>
  );
}

function MediaControls({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-nd-text-muted/15 px-3 text-xs text-nd-text-muted hover:text-nd-text"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {playing ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-nd-text-muted/15 px-3 text-xs text-nd-text-muted hover:text-nd-text"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Replay
      </button>
    </div>
  );
}
