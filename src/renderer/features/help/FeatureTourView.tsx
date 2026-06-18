import { useState, useCallback } from "react";
import { BookOpen, CheckCircle2, Play } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import type { NeuroDeckState } from "../../types/neurodeck";

interface Tour {
  id: string;
  title: string;
  description: string;
  steps: number;
  category: "core" | "advanced" | "deck";
}

const TOURS: Tour[] = [
  {
    id: "first-chat",
    title: "Your First AI Chat",
    description: "Send your first message to NEURODECK's AI, explore personas, and use RAG memory.",
    steps: 5,
    category: "core",
  },
  {
    id: "terminal-basics",
    title: "Terminal Basics",
    description: "Open a PTY shell, create tabs, and run your first command.",
    steps: 4,
    category: "core",
  },
  {
    id: "memory-and-context",
    title: "Memory & Context",
    description: "Add facts to memory, index a project, and watch context injection in action.",
    steps: 6,
    category: "advanced",
  },
  {
    id: "agent-run",
    title: "Running an Agent",
    description: "Configure and launch an autonomous agent to complete a multi-step task.",
    steps: 7,
    category: "advanced",
  },
  {
    id: "plugins-lua",
    title: "Lua Plugin Development",
    description: "Write a custom Lua plugin, register a command, and test it live.",
    steps: 5,
    category: "advanced",
  },
  {
    id: "deck-layout",
    title: "Steam Deck Layout",
    description: "Learn the gamepad controls, radial menu, and controller hint bar.",
    steps: 4,
    category: "deck",
  },
  {
    id: "deck-game-mode",
    title: "Game Mode Integration",
    description: "Run NEURODECK in gamescope 1280×800 and set up Steam Input.",
    steps: 3,
    category: "deck",
  },
];

const CATEGORY_LABELS: Record<Tour["category"], string> = {
  core: "Core",
  advanced: "Advanced",
  deck: "Steam Deck",
};

const STORAGE_KEY = "nd:completed-tutorials";

function loadCompleted(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function markCompleted(id: string) {
  const list = loadCompleted();
  if (!list.includes(id)) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...list, id]));
    } catch { /* quota */ }
  }
}

export function FeatureTourView({ state: _state }: { state: NeuroDeckState }) {
  const [completed, setCompleted] = useState<string[]>(loadCompleted);
  const [active, setActive] = useState<string | null>(null);

  const handleStart = useCallback((tourId: string) => {
    setActive(tourId);
    markCompleted(tourId);
    setCompleted(loadCompleted());
  }, []);

  const handleReset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* quota */ }
    setCompleted([]);
  }, []);

  const categories: Tour["category"][] = ["core", "advanced", "deck"];
  const allDone = completed.length >= TOURS.length;

  return (
    <Panel
      eyebrow="Help"
      title="Feature Tours"
      data-testid="feature-tour-view"
      className="h-full overflow-hidden"
      scrollable
      action={
        <Button variant="ghost" size="sm" onClick={handleReset} aria-label="Reset all tour progress">
          Reset Progress
        </Button>
      }
    >
      <div className="flex flex-col gap-6 p-4">
        {TOURS.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="No tours available"
            description="Feature tours are not available in this build."
          />
        )}
        {allDone && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-2xl border border-nd-status-success/30 bg-nd-status-success/5 px-4 py-3 text-nd-status-success"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
            <span className="font-medium">All tours complete! You know NEURODECK inside out.</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-nd-text-muted">
          <BookOpen className="h-4 w-4" aria-hidden />
          {completed.length} of {TOURS.length} tours completed
        </div>

        {categories.map((cat) => {
          const catTours = TOURS.filter((t) => t.category === cat);
          return (
            <section key={cat} aria-label={`${CATEGORY_LABELS[cat]} tours`}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-nd-text-muted">
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="flex flex-col gap-2" role="list">
                {catTours.map((tour) => {
                  const isDone = completed.includes(tour.id);
                  const isRunning = active === tour.id;
                  return (
                    <div
                      key={tour.id}
                      role="listitem"
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                        isDone
                          ? "border-nd-status-success/20 bg-nd-status-success/5"
                          : "border-nd-border-subtle bg-nd-surface-secondary/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {isDone && (
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-nd-status-success"
                            aria-label="Completed"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-nd-text-primary">{tour.title}</p>
                          <p className="text-xs text-nd-text-muted">
                            {tour.steps} steps — {tour.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {isDone && <StatusChip tone="success" size="sm">Done</StatusChip>}
                        <Button
                          variant={isDone ? "ghost" : "secondary"}
                          size="sm"
                          icon={isRunning ? undefined : Play}
                          loading={isRunning}
                          onClick={() => handleStart(tour.id)}
                          aria-label={isDone ? `Replay ${tour.title}` : `Start ${tour.title}`}
                        >
                          {isDone ? "Replay" : "Start"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
