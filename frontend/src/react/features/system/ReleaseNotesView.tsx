import { useState } from "react";
import { FileText } from "lucide-react";
import { Panel } from "../../components/primitives/Panel";
import type { NeuroDeckState } from "../../types/neurodeck";

interface ReleaseNote {
  version: string;
  date: string;
  codename: string;
  summary: string;
  added: string[];
  improved: string[];
  fixed: string[];
  breaking: string[];
}

const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "v1.8.0",
    codename: "Ptah",
    date: "2026-06-17",
    summary: "Sprint 2-6 AAAA Hardening & Design Polish",
    added: [
      "Full AAAA accessibility audit pass (WCAG AAA)",
      "React 18 migration + TypeScript strict mode",
      "77-screen wireframe documentation",
      "Theme Editor drawer + Wallpaper Manager",
      "37 new view implementations",
    ],
    improved: [
      "IPC bridge stability and retry logic",
      "PTY session restart race condition resolved",
      "Memory DB cosine similarity performance",
      "Design token system with surface layers and brand gradients",
    ],
    fixed: [
      "CSS specificity trap in #view-* ID rules",
      "FTP buffer memory leak for large files",
      "Modal focus trap escape on nested dialogs",
    ],
    breaking: [
      "Tauri compat stubs removed from new commands — use Arc<Mutex<AppState>> + WsBroadcaster",
    ],
  },
  {
    version: "v1.7.0",
    codename: "Sekhmet",
    date: "2026-05-22",
    summary: "React 18 Migration & TypeScript Strict",
    added: [
      "Full React 18 concurrent mode migration",
      "TypeScript strict mode enforcement",
      "Design system component library (22 primitives)",
      "bridgeAdapter v2 with domain namespacing",
    ],
    improved: [
      "Bundle size reduced by 40% via code splitting",
      "Startup time under 2s on Steam Deck",
    ],
    fixed: ["Memory leak in xterm.js session cleanup", "WebSocket reconnect storm on wake"],
    breaking: [],
  },
];

export function ReleaseNotesView({ state: _state }: { state: NeuroDeckState }) {
  const [selected, setSelected] = useState(RELEASE_NOTES[0].version);
  const note = RELEASE_NOTES.find((n) => n.version === selected) ?? RELEASE_NOTES[0];

  return (
    <Panel
      eyebrow="System"
      title="Release Notes"
      data-testid="release-notes-view"
      className="h-full overflow-hidden"
      scrollable
    >
      <div className="flex flex-col gap-4 p-4">
        {/* Version picker */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select version">
          {RELEASE_NOTES.map((n) => (
            <button
              key={n.version}
              onClick={() => setSelected(n.version)}
              aria-pressed={selected === n.version}
              className={`rounded-xl border px-3 py-1.5 text-sm font-mono font-semibold transition ${
                selected === n.version
                  ? "border-nd-accent-primary/50 bg-nd-accent-primary/10 text-nd-accent-primary"
                  : "border-nd-border-subtle text-nd-text-muted hover:border-nd-accent-primary/30"
              }`}
            >
              {n.version}
            </button>
          ))}
        </div>

        {/* Header */}
        <section
          aria-label={`Release ${note.version}`}
          className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nd-accent-primary/25 bg-nd-accent-primary/10 text-nd-accent-primary">
              <FileText className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-black text-nd-text-primary">
                {note.version}-{note.codename.toLowerCase()}
              </h2>
              <p className="text-sm text-nd-text-muted">
                {note.date} — {note.summary}
              </p>
            </div>
          </div>
        </section>

        {/* Sections */}
        {[
          { key: "added", emoji: "✨", label: "What's New", items: note.added },
          { key: "improved", emoji: "🛠", label: "Improvements", items: note.improved },
          { key: "fixed", emoji: "🐛", label: "Bug Fixes", items: note.fixed },
          { key: "breaking", emoji: "⚠", label: "Breaking Changes", items: note.breaking },
        ]
          .filter((s) => s.items.length > 0)
          .map((s) => (
            <section key={s.key} aria-label={s.label}>
              <h3 className="mb-2 font-semibold text-nd-text-primary">
                {s.emoji} {s.label}
              </h3>
              <ul className="flex flex-col gap-1.5 pl-1" role="list">
                {s.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-nd-text-secondary">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-nd-accent-primary/60" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </Panel>
  );
}
