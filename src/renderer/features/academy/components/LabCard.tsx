import { Clock, Play } from "lucide-react";
import { Badge } from "../../../components/primitives/Badge";
import { Button } from "../../../components/primitives/Button";
import type { Lab } from "../types";

const TYPE_LABELS: Record<string, string> = {
  "log-analysis": "Log Analysis",
  terminal: "Terminal",
  "soc-alert": "SOC Alert",
  ticket: "Help Desk Ticket",
  packet: "Packet Analysis",
  cloud: "Cloud Security",
};

const TYPE_TONE: Record<string, "accent" | "success" | "warning" | "neutral"> = {
  "log-analysis": "accent",
  terminal: "success",
  "soc-alert": "warning",
  ticket: "neutral",
  packet: "accent",
  cloud: "success",
};

interface LabCardProps {
  lab: Lab;
  completed: boolean;
  onStart: (labId: string) => void;
}

export function LabCard({ lab, completed, onStart }: LabCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-nd-border-subtle bg-nd-surface-base/50 p-4 transition hover:border-nd-accent-primary/25 hover:bg-nd-surface-base/70">
      {/* Difficulty pips */}
      <div
        className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5"
        role="img"
        aria-label={`Difficulty ${lab.difficulty} of 5`}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition ${
              i < lab.difficulty ? "bg-nd-accent-primary" : "bg-nd-text-muted/20"
            }`}
          />
        ))}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={TYPE_TONE[lab.type] ?? "neutral"}>{TYPE_LABELS[lab.type] ?? lab.type}</Badge>
          {completed && <Badge tone="success">Completed</Badge>}
        </div>
        <p className="text-sm font-semibold text-nd-text-primary">{lab.title}</p>
        <p className="text-xs leading-5 text-nd-text-muted">{lab.objectives[0]}</p>
        <div className="flex items-center gap-1 text-[11px] text-nd-text-muted/80">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>{lab.estimatedMinutes} min</span>
          <span className="mx-1">·</span>
          <span>{lab.tasks.length} tasks</span>
        </div>
      </div>

      <Button
        size="sm"
        variant="soft"
        icon={Play}
        iconPosition="left"
        onClick={() => onStart(lab.id)}
        aria-label={`${completed ? "Redo" : "Start"} ${lab.title}`}
      >
        {completed ? "Redo" : "Start"}
      </Button>
    </div>
  );
}
