import type { ThemeTokenSet } from "./themeContracts";

export function adjustTokensForMotion(tokens: ThemeTokenSet, motionProfile: string): ThemeTokenSet {
  const adjusted = JSON.parse(JSON.stringify(tokens)) as ThemeTokenSet;

  switch (motionProfile) {
    case "fast":
      adjusted.motion.durationFast = "75ms";
      adjusted.motion.durationNormal = "150ms";
      adjusted.motion.durationSlow = "300ms";
      break;

    case "slow":
      adjusted.motion.durationFast = "200ms";
      adjusted.motion.durationNormal = "400ms";
      adjusted.motion.durationSlow = "800ms";
      break;

    case "reduced":
      adjusted.motion.durationFast = "0ms";
      adjusted.motion.durationNormal = "0ms";
      adjusted.motion.durationSlow = "0ms";
      adjusted.motion.pulseIntensity = 0;
      adjusted.motion.glowIntensity = 0;
      break;
  }

  return adjusted;
}
