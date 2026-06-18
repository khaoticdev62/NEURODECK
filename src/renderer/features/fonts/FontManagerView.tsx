import type { Dispatch } from "react";
import { useMemo, useState } from "react";
import { Type, Check, X } from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { IconButton } from "../../components/primitives/IconButton";
import { Panel } from "../../components/primitives/Panel";
import { TextInput } from "../../components/primitives/TextInput";
import { fontOptions } from "../../types/seed";
import type { FontCategory, NeuroDeckAction, NeuroDeckState } from "../../types/neurodeck";

const SAMPLE_TEXT = "NEURODECK v6 — Local AI, zero latency.";
const MONO_SAMPLE = 'fn main() { println!("Hello"); }';
const CATEGORIES: FontCategory[] = ["Sans Serif", "Serif", "Monospace", "Sci-Fi", "Display"];

export function FontManagerView({
  state,
  dispatch,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FontCategory | "All">("All");

  const filtered = useMemo(() => {
    return fontOptions.filter((f) => {
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || f.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const applyFont = (fontId: string) => {
    dispatch({ type: "set-font", font: fontId });
  };

  const activeFont = fontOptions.find((f) => f.id === state.selectedFont);

  return (
    <Panel
      eyebrow="Typography"
      title="Font Manager"
      data-testid="font-manager-view"
      className="flex h-full flex-col overflow-hidden"
    >
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-nd-text-secondary">
          {fontOptions.length} typefaces available • Active:{" "}
          <span
            className="font-medium text-nd-text-primary"
            style={{ fontFamily: activeFont?.family }}
          >
            {activeFont?.name}
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <TextInput
            id="font-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fonts..."
            aria-label="Search fonts"
            className="flex-1 min-w-[12rem]"
          />
          {search && (
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          )}

          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="xs"
              variant={category === "All" ? "primary" : "ghost"}
              onClick={() => setCategory("All")}
            >
              All
            </Button>
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                type="button"
                size="xs"
                variant={category === c ? "primary" : "ghost"}
                onClick={() => setCategory(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((font) => {
            const isActive = state.selectedFont === font.id;
            const preview = font.category === "Monospace" ? MONO_SAMPLE : SAMPLE_TEXT;
            return (
              <button
                key={font.id}
                type="button"
                onClick={() => applyFont(font.id)}
                aria-pressed={isActive}
                aria-label={`${font.name}${isActive ? " (active)" : ""}`}
                className={`group relative min-h-touch flex flex-col rounded-2xl border p-4 text-left transition duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60 ${
                  isActive
                    ? "border-nd-accent-primary/50 bg-nd-accent-primary/[0.07] shadow-[var(--nd-glow-brand-sm)]"
                    : "border-nd-border-subtle bg-nd-surface-secondary/30 hover:border-nd-accent-primary/30 hover:bg-nd-surface-tertiary/30"
                }`}
              >
                {isActive && (
                  <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-nd-accent-primary text-nd-surface-primary">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                )}

                <div className="mb-3 flex items-center gap-2">
                  <Badge tone="neutral" size="sm">
                    {font.category}
                  </Badge>
                  <span className="text-2xs text-nd-text-muted">{font.weights.length} weights</span>
                </div>

                <p className="text-sm font-semibold text-nd-text-primary">{font.name}</p>

                <div className="mt-3 flex-1 rounded-xl border border-nd-border-subtle bg-nd-surface-primary/60 p-3">
                  <p
                    className="text-lg leading-relaxed text-nd-text-secondary"
                    style={{ fontFamily: font.family }}
                  >
                    {preview}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-2xs text-nd-text-muted">
                    {font.family.split(",")[0].replace(/"/g, "")}
                  </span>
                  {isActive ? (
                    <span className="text-xs font-medium text-nd-accent-primary">Active</span>
                  ) : (
                    <span className="text-xs text-nd-text-muted">Click to apply</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <EmptyState
            icon={Type}
            title="No fonts match your search"
            description="Try a different query or category."
          />
        )}
      </div>
    </Panel>
  );
}
