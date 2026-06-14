import { ImageIcon, MonitorPlay, SlidersHorizontal } from "lucide-react";
import { useTheme } from "../../theme/useTheme";

export function LiveWallpaperPanel() {
  const { availableWallpapers, settings, updateSettings } = useTheme();

  const applyWallpaper = (wallpaperId: string) => {
    void updateSettings({
      activeWallpaperId: wallpaperId,
      liveWallpaperEnabled: wallpaperId !== "none",
    });
  };

  const handleOpacity = (value: number) => {
    void updateSettings({ wallpaperOpacity: value });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-nd-accent-primary" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="wallpaper-opacity" className="text-xs font-semibold text-nd-text-primary/80">
              Wallpaper Opacity
            </label>
            <span className="text-xs tabular-nums text-nd-text-muted">
              {settings.wallpaperOpacity}%
            </span>
          </div>
          <input
            id="wallpaper-opacity"
            type="range"
            min={0}
            max={80}
            step={1}
            value={settings.wallpaperOpacity}
            onChange={(event) => handleOpacity(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer accent-nd-accent-primary"
            aria-label="Wallpaper opacity"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => applyWallpaper("none")}
          className={`flex flex-col gap-1.5 rounded-xl border p-0 text-left transition focus-visible:outline-2 focus-visible:outline-nd-accent-primary ${
            settings.activeWallpaperId === "none" || !settings.liveWallpaperEnabled
              ? "border-nd-accent-primary/50 ring-1 ring-nd-accent-primary/30"
              : "border-nd-border-subtle hover:border-nd-border-default"
          }`}
          aria-pressed={settings.activeWallpaperId === "none" || !settings.liveWallpaperEnabled}
        >
          <div className="flex h-20 w-full items-center justify-center rounded-t-xl bg-nd-surface-app">
            <ImageIcon className="h-5 w-5 text-nd-text-muted/70" aria-hidden="true" />
          </div>
          <div className="px-2 pb-2">
            <p className="text-[11px] font-semibold leading-tight text-nd-text-primary/80">No Wallpaper</p>
            <p className="text-[10px] leading-tight text-nd-text-muted/70">
              Disable animated and ambient background layers.
            </p>
          </div>
        </button>

        {availableWallpapers.map((wallpaper) => {
          const active = settings.activeWallpaperId === wallpaper.id && settings.liveWallpaperEnabled;
          const accent = wallpaper.visuals.basePalette[0] ?? "var(--nd-accent-primary)";
          const accentSecondary = wallpaper.visuals.basePalette[1] ?? accent;

          return (
            <button
              key={wallpaper.id}
              type="button"
              onClick={() => applyWallpaper(wallpaper.id)}
              className={`flex flex-col gap-1.5 rounded-xl border p-0 text-left transition focus-visible:outline-2 focus-visible:outline-nd-accent-primary ${
                active
                  ? "border-nd-accent-primary/50 ring-1 ring-nd-accent-primary/30"
                  : "border-nd-border-subtle hover:border-nd-border-default"
              }`}
              aria-pressed={active}
            >
              <div
                className="flex h-20 w-full items-start justify-between rounded-t-xl px-3 py-2"
                style={{
                  background: `linear-gradient(135deg, ${accent}22 0%, ${accentSecondary}18 55%, rgba(5,5,5,0.95) 100%)`,
                }}
              >
                <span className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
                  {wallpaper.renderer.replace(/_/g, " ")}
                </span>
                <MonitorPlay className="h-4 w-4 text-white/70" aria-hidden="true" />
              </div>
              <div className="px-2 pb-2">
                <p className="text-[11px] font-semibold leading-tight text-nd-text-primary/80">
                  {wallpaper.name}
                </p>
                <p className="text-[10px] leading-tight text-nd-text-muted/70 line-clamp-2">
                  {wallpaper.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
