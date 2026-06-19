import { Activity, Cpu, HardDrive, Layers, Zap } from "lucide-react";
import { StatusChip } from "../../components/primitives/StatusChip";
import type { AIProviderHealth } from "../../types/neurodeck";

interface TelemetryWidgetProps {
  provider: string;
  model: string;
  ramUsageMb: number;
  memoryDocCount: number;
  aiHealth: AIProviderHealth[];
}

export function TelemetryWidget({
  provider,
  model,
  ramUsageMb,
  memoryDocCount,
  aiHealth,
}: TelemetryWidgetProps) {
  const ready = aiHealth.filter((h) => h.available).length;
  const total = aiHealth.length || 1;
  const healthPercent = Math.round((ready / total) * 100);

  const items = [
    { icon: Zap, label: "Provider", value: provider || "None" },
    { icon: Activity, label: "Model", value: model || "default" },
    { icon: Cpu, label: "RAM", value: `${Math.round(ramUsageMb)} MB` },
    { icon: Layers, label: "Memory", value: `${memoryDocCount.toLocaleString()} docs` },
    { icon: HardDrive, label: "Health", value: `${ready}/${total} ready` },
  ];

  return (
    <div
      role="group"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
      aria-label="System telemetry"
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className="relative overflow-hidden rounded-xl border border-nd-border-subtle bg-[var(--nd-surface-glass)]/25 p-2.5 transition duration-fast hover:border-nd-accent-primary/25 hover:bg-[var(--nd-surface-hover)]"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <div className="grid grid-cols-[36px_minmax(0,1fr)] grid-rows-2 items-center gap-x-2.5">
            <div className="row-span-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-border-subtle bg-nd-surface-tertiary/20 text-nd-accent-primary">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="self-end text-xs uppercase tracking-wider text-nd-text-muted/80">
              {item.label}
            </div>
            <div
              className="flex min-w-0 items-center gap-1.5 self-start truncate text-sm font-semibold text-nd-text-primary"
              title={item.value}
              aria-label={`${item.label}: ${item.value}`}
            >
              <span className="truncate">{item.value}</span>
              {item.label === "Health" && (
                <StatusChip
                  tone={ready === total ? "success" : ready > 0 ? "warning" : "error"}
                  size="sm"
                >
                  {healthPercent}%
                </StatusChip>
              )}
            </div>
          </div>
          <div
            className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-nd-accent-primary/20 to-transparent"
            aria-hidden="true"
          />
        </div>
      ))}
    </div>
  );
}
