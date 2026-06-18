import { Check, Palette, RotateCcw } from "lucide-react";
import { Button } from "../../../components/primitives/Button";
import { EmptyState } from "../../../components/primitives/EmptyState";
import { useTheme } from "../../../theme/useTheme";
import { useThemePreview } from "../hooks/useThemePreview";
import { ThemePreview } from "./ThemePreview";

export function ThemePicker() {
  const { activeTheme, availableThemes, settings, resetToDefaults } = useTheme();
  const {
    pendingThemeId,
    hoveredThemeId,
    setHoveredThemeId,
    setPendingThemeId,
    applyPending,
    cancelPending,
  } = useThemePreview();

  if (availableThemes.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Palette}
          title="Theme settings unavailable."
          description="Theme data could not be loaded. Reset appearance to restore defaults."
          action={
            <Button variant="secondary" icon={RotateCcw} onClick={() => void resetToDefaults()}>
              Reset Appearance
            </Button>
          }
        />
      </div>
    );
  }

  const previewId = hoveredThemeId ?? pendingThemeId ?? settings.activeThemeId;
  const previewTheme = availableThemes.find((t) => t.id === previewId) ?? activeTheme;
  const hasPendingChange = pendingThemeId !== null && pendingThemeId !== settings.activeThemeId;

  return (
    <div id="theme-cards-grid">
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_200px]">
        {/* Left: theme card grid */}
        <div
          className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
          onMouseLeave={() => setHoveredThemeId(null)}
        >
          {availableThemes.map((theme) => {
            const isActive = settings.activeThemeId === theme.id;
            const isPending = pendingThemeId === theme.id && !isActive;
            return (
              <button
                key={theme.id}
                type="button"
                data-testid="theme-card"
                onMouseEnter={() => setHoveredThemeId(theme.id)}
                onClick={() =>
                  setPendingThemeId((prev) => (prev === theme.id ? null : theme.id))
                }
                aria-pressed={isActive}
                className={`onboarding-theme-card relative rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40 ${
                  isActive
                    ? "border-nd-accent-success/40 bg-nd-accent-success/[0.06]"
                    : isPending
                      ? "border-nd-accent-primary/50 bg-nd-accent-primary/[0.08]"
                      : "border-nd-border-subtle bg-nd-surface-secondary/40 hover:border-nd-accent-primary/30"
                }`}
              >
                {isActive && (
                  <span
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-nd-accent-success"
                    aria-label="Active theme"
                  >
                    <Check className="h-3 w-3 text-nd-surface-app" />
                  </span>
                )}
                {isPending && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border border-nd-accent-primary/40 bg-nd-accent-primary/20 text-[8px] font-bold text-nd-accent-primary">
                    ▶
                  </span>
                )}
                <div className="mb-2 flex gap-1">
                  {[
                    theme.tokens.color.accent.primary,
                    theme.tokens.color.accent.secondary,
                    theme.tokens.color.text.warning,
                    theme.tokens.color.text.danger,
                    theme.tokens.color.surface.raised,
                  ].map((c, i) => (
                    <span
                      key={i}
                      className="h-3 flex-1 rounded-full"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <p className="text-xs font-semibold text-nd-text-primary truncate">{theme.name}</p>
                <p className="mt-1 text-[11px] leading-4 text-nd-text-muted line-clamp-2">
                  {theme.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right: live preview pane */}
        <div className="flex flex-col gap-3">
          <ThemePreview name={previewTheme.name} color={previewTheme.tokens.color} />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-nd-text-primary truncate">{previewTheme.name}</p>
            <p className="text-[11px] text-nd-text-muted leading-4 line-clamp-2">
              {hoveredThemeId
                ? "Hover to preview — click to select"
                : hasPendingChange
                  ? "Selected — click Apply to switch"
                  : "Currently active"}
            </p>
          </div>

          {/* Apply / Cancel controls */}
          <div className="flex flex-col gap-1.5">
            <Button
              variant="primary"
              size="sm"
              fullWidth
              disabled={!hasPendingChange}
              icon={Check}
              onClick={applyPending}
            >
              {hasPendingChange ? "Apply Theme" : "Applied"}
            </Button>
            {hasPendingChange && (
              <Button variant="secondary" size="sm" fullWidth onClick={cancelPending}>
                Cancel
              </Button>
            )}
          </div>

          <p className="text-[10px] text-nd-text-muted/70 leading-4">
            Full wallpaper and display tuning in the{" "}
            <strong className="text-nd-text-muted">Themes</strong> tab.
          </p>
        </div>
      </div>
    </div>
  );
}
