import React, { useEffect, useState } from "react";
import { useTheme } from "../../theme/useTheme";
import { CanvasWallpaperRenderer } from "./CanvasWallpaperRenderer";

export const LiveWallpaperHost: React.FC = () => {
  const { settings } = useTheme();
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Monitor OS prefers-reduced-motion
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);

    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  // Monitor window visibility and focus to pause rendering loops
  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.visibilityState === "hidden");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  if (!settings.liveWallpaperEnabled || reducedMotion) {
    return null; // Don't render animations if disabled or user prefers reduced motion
  }

  const wpId = settings.activeWallpaperId;
  const isCanvas = [
    "terminal_rainfield",
    "oled_starfield",
    "ghost_particles",
    "tactical_signal_grid",
    "deep_space_radar",
    "solar_circuit",
    "command_waveform",
    "code_stream",
  ].includes(wpId);

  return (
    <div className="absolute inset-0 -z-50 pointer-events-none overflow-hidden h-full w-full select-none">
      {isCanvas ? (
        <CanvasWallpaperRenderer
          wallpaperId={wpId}
          opacity={settings.wallpaperOpacity}
          performanceTier={settings.performanceTier}
          isPaused={isPaused}
        />
      ) : wpId === "neural_aurora" ? (
        <div
          className="absolute inset-0 h-full w-full opacity-30 animate-pulse bg-gradient-to-tr from-nd-accent/20 via-nd-surface to-nd-accent-secondary/10"
          style={{
            animationDuration: "12s",
            opacity: settings.wallpaperOpacity / 100,
          }}
        />
      ) : wpId === "kernel_heatmap" ? (
        <div
          className="absolute inset-0 h-full w-full opacity-20 animate-pulse bg-gradient-to-br from-nd-danger/15 via-nd-surface to-nd-warning/10"
          style={{
            animationDuration: "15s",
            opacity: settings.wallpaperOpacity / 100,
          }}
        />
      ) : wpId === "violet_stormfront" ? (
        <div
          className="absolute inset-0 h-full w-full opacity-25 animate-pulse bg-gradient-to-tr from-nd-accent-tertiary/20 via-nd-surface to-nd-accent-secondary/15"
          style={{
            animationDuration: "8s",
            opacity: settings.wallpaperOpacity / 100,
          }}
        />
      ) : null}
    </div>
  );
};
