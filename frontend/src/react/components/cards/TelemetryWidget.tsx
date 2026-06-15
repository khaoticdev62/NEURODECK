import { BrainCircuit, Gauge, HardDrive, Sparkles } from "lucide-react";
import { MetricCard } from "../primitives/MetricCard";

interface TelemetryWidgetProps {
  latencyMs: number;
  cacheHealth: number;
  readyModels: number;
  completedRuns: number;
}

export function TelemetryWidget({
  latencyMs,
  cacheHealth,
  readyModels,
  completedRuns,
}: TelemetryWidgetProps) {
  return (
    <section className="grid gap-2 md:grid-cols-4" aria-label="Telemetry">
      <MetricCard icon={BrainCircuit} label="Models" value={readyModels} hint="available locally" />
      <MetricCard icon={Gauge} label="Latency" value={`${latencyMs}ms`} hint="last AI response" />
      <MetricCard icon={Sparkles} label="Runs" value={completedRuns} hint="agent completions" />
      <MetricCard
        icon={HardDrive}
        label="Cache"
        value={`${cacheHealth}%`}
        hint="offline readiness"
      />
    </section>
  );
}
