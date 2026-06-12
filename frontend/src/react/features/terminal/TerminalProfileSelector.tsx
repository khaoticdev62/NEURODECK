import type { TerminalProfileAvailability } from "../../../../../src/shared/terminal/terminalProfiles";

type Props = {
  profiles: TerminalProfileAvailability[];
  selectedProfileId: string;
  onSelect: (profileId: string) => void;
};

export function TerminalProfileSelector({ profiles, selectedProfileId, onSelect }: Props) {
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
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.name} {profile.shellStatus === "ready" ? "• ready" : "• missing"}
          </option>
        ))}
      </select>
      <div className="mt-3 space-y-2">
        {profiles.slice(0, 4).map((profile) => (
          <div key={profile.id} className={`rounded-2xl border px-3 py-2 text-xs ${profile.id === selectedProfileId ? "border-nd-accent/30 bg-nd-accent/[0.08]" : "border-nd-text-muted/15 bg-nd-surface/40"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-nd-text">{profile.name}</span>
              <span className={profile.shellAvailable ? "text-nd-success" : "text-nd-danger"}>{profile.shellStatus}</span>
            </div>
            <div className="mt-1 text-nd-text-muted">{profile.description}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

