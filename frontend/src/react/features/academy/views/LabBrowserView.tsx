import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { EmptyState } from "../../../components/primitives/EmptyState";
import { Panel } from "../../../components/primitives/Panel";
import { Select } from "../../../components/primitives/Select";
import { LabCard } from "../components/LabCard";
import { ALL_LABS, LEARNING_PATHS } from "../data/curricula";
import type { LearnerProgress, LabType, Difficulty } from "../types";

type FilterType = LabType | "all";
type FilterPath = string | "all";

const TYPE_FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "log-analysis", label: "Log Analysis" },
  { value: "terminal", label: "Terminal" },
  { value: "soc-alert", label: "SOC Alert" },
  { value: "ticket", label: "Ticket" },
  { value: "packet", label: "Packet" },
  { value: "cloud", label: "Cloud" },
];

const DIFFICULTY_OPTIONS = [
  { value: "0", label: "Any Difficulty" },
  { value: "1", label: "Difficulty 1" },
  { value: "2", label: "Difficulty 2" },
  { value: "3", label: "Difficulty 3" },
  { value: "4", label: "Difficulty 4" },
  { value: "5", label: "Difficulty 5" },
];

interface LabBrowserViewProps {
  progress: LearnerProgress;
  onStartLab: (labId: string) => void;
}

export function LabBrowserView({ progress, onStartLab }: LabBrowserViewProps) {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterPath, setFilterPath] = useState<FilterPath>("all");
  const [filterDiff, setFilterDiff] = useState<Difficulty | 0>(0);

  const filtered = ALL_LABS.filter((lab) => {
    if (filterType !== "all" && lab.type !== filterType) return false;
    if (filterPath !== "all" && lab.pathId !== filterPath) return false;
    if (filterDiff !== 0 && lab.difficulty !== filterDiff) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-start gap-3" role="group" aria-label="Lab filters">
        {/* Type filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilterType(value)}
              aria-pressed={filterType === value}
              className={`min-h-touch rounded-lg border px-3 py-1.5 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/50 ${
                filterType === value
                  ? "border-nd-accent-primary/40 bg-nd-accent-primary/15 text-nd-accent-primary"
                  : "border-nd-border-subtle/50 bg-nd-surface-base/40 text-nd-text-secondary hover:border-nd-accent-primary/20 hover:text-nd-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Path filter */}
        <Select
          value={filterPath}
          onChange={(e) => setFilterPath(e.target.value)}
          aria-label="Filter by learning path"
          options={[
            { value: "all", label: "All Paths" },
            ...LEARNING_PATHS.map((p) => ({ value: p.id, label: p.title })),
          ]}
          className="min-w-[10rem]"
        />

        {/* Difficulty filter */}
        <Select
          value={String(filterDiff)}
          onChange={(e) => setFilterDiff(Number(e.target.value) as Difficulty | 0)}
          aria-label="Filter by difficulty"
          options={DIFFICULTY_OPTIONS}
          className="min-w-[10rem]"
        />
      </div>

      {/* Result count */}
      <p className="text-[11px] text-nd-text-muted/80" aria-live="polite">
        {filtered.length} lab{filtered.length !== 1 ? "s" : ""} found
      </p>

      {/* Lab list */}
      <Panel eyebrow="Labs" title="Available Labs">
        <div className="space-y-3 p-4">
          {filtered.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No labs match these filters"
              description="Try broadening your search by clearing one or more filters."
              compact
            />
          ) : (
            filtered.map((lab) => (
              <LabCard
                key={lab.id}
                lab={lab}
                completed={progress.completedLabs.includes(lab.id)}
                onStart={onStartLab}
              />
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
