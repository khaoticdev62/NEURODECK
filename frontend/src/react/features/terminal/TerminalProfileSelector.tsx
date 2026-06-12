import type { TerminalProfileAvailability } from "../../../../../src/shared/terminal/terminalProfiles";

const PLATFORM_LABELS: Record<string, string> = {
  steamdeck: "Steam Deck",
  linux: "Linux",
  macos: "macOS",
  windows: "Windows",
  cross_platform: "Cross-platform",
};

type Props = {
  profiles: TerminalProfileAvailability[];
  selectedProfileId: string;
  onSelect: (profileId: string) => void;
};

export function TerminalProfileSelector({ profiles, selectedProfileId, onSelect }: Props) {
  const selected = profiles.find((p) => p.id === selectedProfileId) ?? profiles[0];

  const byPlatform = profiles.reduce<Record<string, TerminalProfileAvailability[]>>((acc, p) => {
    (acc[p.platform] ??= []).push(p);
    return acc;
  }, {});

  return (
    <section className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Profile</p>
        <h3 className="text-sm font-semibold text-nd-text">Shell profile</h3>
      </div>
      <select
        value={selectedProfileId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none"
        aria-label="Select shell profile"
      >
        {Object.entries(byPlatform).map(([platform, group]) => (
          <optgroup key={platform} label={PLATFORM_LABELS[platform] ?? platform}>
            {group.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} {profile.shellStatus === "ready" ? "• ready" : "• missing"}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {selected && (
        <div className={`mt-3 rounded-2xl border px-3 py-2 text-xs ${selected.shellAvailable ? "border-nd-accent/30 bg-nd-accent/[0.08]" : "border-nd-danger/30 bg-nd-danger/[0.06]"}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-nd-text">{selected.name}</span>
            <span className={selected.shellAvailable ? "text-nd-success" : "text-nd-danger"}>
              {selected.shellAvailable ? "ready" : "shell not found"}
            </span>
          </div>
          <div className="mt-1 text-nd-text-muted">{selected.description}</div>
          {selected.detectedPath && (
            <div className="mt-1 font-mono text-[0.65rem] text-nd-text-muted opacity-60">{selected.detectedPath}</div>
          )}
        </div>
      )}
    </section>
  );
}

