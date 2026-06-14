import { BrainCircuit, CheckCircle2, DownloadCloud, Power } from "lucide-react";
import { Badge } from "../../../design-system";
import { Button } from "../../../design-system";
import { Panel } from "../../../design-system";
import type { LocalModel, ModelStatus } from "../../types/neurodeck";

interface ModelCardProps {
  model: LocalModel;
  selected: boolean;
  policyAllowed?: boolean;
  policyReason?: string;
  agentPreferred?: boolean;
  onMarkReady: (id: string) => void;
  onMarkIndexed: (id: string) => void;
  onDisable: (id: string) => void;
  onSelect: (id: string) => void;
}

const statusTone: Record<ModelStatus, "neutral" | "info" | "success" | "warning"> = {
  ready: "success",
  indexed: "info",
  missing: "warning",
  disabled: "neutral",
};

export function ModelCard({
  model,
  selected,
  policyAllowed,
  policyReason,
  agentPreferred,
  onMarkReady,
  onMarkIndexed,
  onDisable,
  onSelect,
}: ModelCardProps) {
  const emphasis = selected
    ? "active"
    : policyAllowed === false
      ? "critical"
      : "default";

  return (
    <Panel emphasis={emphasis} className="transition hover:border-[rgba(var(--nd-cyan-rgb),0.3)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-[var(--nd-radius-md)] border text-[var(--nd-accent-agent)] ${
              policyAllowed === false
                ? "border-[rgba(var(--nd-red-rgb),0.3)] bg-[rgba(var(--nd-red-rgb),0.12)] text-[var(--nd-accent-error)]"
                : "border-[rgba(var(--nd-purple-rgb),0.3)] bg-[rgba(var(--nd-purple-rgb),0.12)]"
            }`}
          >
            <BrainCircuit className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--nd-text-primary)]">{model.name}</h3>
            <p className="text-xs text-[var(--nd-text-muted)]">
              {model.provider} · {model.size} · {model.quantization}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={statusTone[model.status]}>{model.status}</Badge>
          {agentPreferred && <Badge tone="agent">Preferred</Badge>}
          {policyAllowed === false && <Badge tone="error">Blocked</Badge>}
          {selected && <Badge tone="info">Selected</Badge>}
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-[var(--nd-text-muted)] sm:grid-cols-3">
        <ModelSpec
          label="Context"
          value={model.context ? model.context.toLocaleString() : "runtime"}
        />
        <ModelSpec label="RAM" value={model.ramEstimate} />
        <ModelSpec label="Best For" value={model.bestFor.join(", ")} />
      </div>

      {policyAllowed === false && policyReason && (
        <p className="mt-3 rounded-[var(--nd-radius-md)] border border-[rgba(var(--nd-red-rgb),0.2)] bg-[rgba(var(--nd-red-rgb),0.1)] px-3 py-2 text-xs text-[var(--nd-accent-error)]">
          {policyReason}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="success"
          size="sm"
          disabled={policyAllowed === false}
          icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          onClick={() => {
            onMarkReady(model.id);
            onSelect(model.id);
          }}
        >
          Mark Ready
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<DownloadCloud className="h-4 w-4" aria-hidden="true" />}
          onClick={() => {
            onMarkIndexed(model.id);
            onSelect(model.id);
          }}
        >
          Indexed
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Power className="h-4 w-4" aria-hidden="true" />}
          onClick={() => onDisable(model.id)}
        >
          Disable
        </Button>
      </div>
    </Panel>
  );
}

function ModelSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-tertiary)] p-3">
      <p className="text-[10px] uppercase tracking-[var(--nd-tracking-hud)] text-[var(--nd-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-[var(--nd-text-secondary)]">{value}</p>
    </div>
  );
}
