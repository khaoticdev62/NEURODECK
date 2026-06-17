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
    <dl
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
      aria-label="System telemetry"
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className="relative overflow-hidden rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-2.5 transition duration-fast hover:border-nd-accent-primary/25 hover:bg-nd-surface-tertiary/40"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-border-subtle bg-nd-surface-tertiary text-nd-accent-primary">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-wider text-nd-text-muted/80">
                {item.label}
              </dt>
              {item.label === "Health" ? (
                <div className="flex items-center gap-1.5">
                  <dd
                    className="truncate text-sm font-semibold text-nd-text-primary"
                    title={item.value}
                    aria-label={`${item.label}: ${item.value}`}
                  >
                    {item.value}
                  </dd>
                  <StatusChip
                    tone={ready === total ? "success" : ready > 0 ? "warning" : "error"}
                    size="sm"
                  >
                    {healthPercent}%
                  </StatusChip>
                </div>
              ) : (
                <dd
                  className="truncate text-sm font-semibold text-nd-text-primary"
                  title={item.value}
                  aria-label={`${item.label}: ${item.value}`}
                >
                  {item.value}
                </dd>
              )}
            </div>
          </div>
          <div
            className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-nd-accent-primary/20 to-transparent"
            aria-hidden="true"
          />
        </div>
      ))}
    </dl>
  );
}
