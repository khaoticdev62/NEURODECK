import { Activity, Cpu, HardDrive, Layers, Zap } from 'lucide-react';
import type { AIProviderHealth } from '../../types/neurodeck';

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

  const items = [
    { icon: Zap, label: 'Provider', value: provider || 'None' },
    { icon: Activity, label: 'Model', value: model || 'default' },
    { icon: Cpu, label: 'RAM', value: `${Math.round(ramUsageMb)} MB` },
    { icon: Layers, label: 'Memory', value: `${memoryDocCount.toLocaleString()} docs` },
    { icon: HardDrive, label: 'Health', value: `${ready}/${total} ready` },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item, index) => (
        <div
          key={item.label}
          className="relative overflow-hidden rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-2.5 transition hover:border-nd-accent/20 hover:bg-nd-surface/40"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-nd-text-muted/15 bg-nd-surface/50 text-nd-accent">
              <item.icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-nd-text-muted/80">{item.label}</p>
              <p className="truncate text-xs font-semibold text-nd-text/90" title={item.value}>{item.value}</p>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-nd-accent/20 to-transparent" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
