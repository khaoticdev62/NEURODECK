import { BrainCircuit, CheckCircle2, DownloadCloud, Power } from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
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
}

const statusTone: Record<ModelStatus, "info" | "success" | "warning" | "error"> = {
  ready: "success",
  indexed: "info",
  missing: "warning",
  disabled: "error",
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
}: ModelCardProps) {
  const status = model.status ?? "missing";
  const panelBorder = selected
    ? "border-nd-accent-primary/40"
    : policyAllowed === false
      ? "border-nd-accent-error/30"
      : "border-nd-border-subtle";
  const panelBg = selected
    ? "bg-nd-accent-primary/[0.05]"
    : policyAllowed === false
      ? "bg-nd-accent-error/[0.03]"
      : "bg-transparent";

  return (
    <Panel
      className={`transition hover:border-nd-accent-primary/30 ${panelBorder} ${panelBg}`}
      aria-label={`${model.name}${selected ? " — selected" : ""}${policyAllowed === false ? " — policy blocked" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div
            aria-hidden="true"
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--nd-radius-md)] border ${
              policyAllowed === false
                ? "border-nd-accent-error/30 bg-nd-accent-error/10 text-nd-accent-error"
                : "border-accent-agent/30 bg-accent-agent/10 text-accent-agent"
            }`}
          >
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-nd-text-primary">{model.name}</h3>
            <p className="text-xs text-nd-text-muted">
              {model.provider} · {model.size} · {model.quantization}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusChip tone={statusTone[status]} size="sm">
            {status}
          </StatusChip>
          <div className="flex flex-wrap justify-end gap-1">
            {agentPreferred && (
              <Badge tone="accent" size="sm">
                Preferred
              </Badge>
            )}
            {policyAllowed === false && (
              <Badge tone="danger" size="sm">
                Blocked
              </Badge>
            )}
            {selected && (
              <Badge tone="accent" size="sm">
                Selected
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-nd-text-muted sm:grid-cols-3">
        <ModelSpec
          label="Context"
          value={model.context ? model.context.toLocaleString() : "runtime"}
        />
        <ModelSpec label="RAM" value={model.ramEstimate} />
        <ModelSpec label="Best For" value={model.bestFor.join(", ")} />
      </div>

      {policyAllowed === false && policyReason && (
        <p className="mt-3 rounded-[var(--nd-radius-md)] border border-nd-accent-error/20 bg-nd-accent-error/10 px-3 py-2 text-xs text-nd-accent-error">
          {policyReason}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="success"
          size="sm"
          disabled={policyAllowed === false}
          icon={CheckCircle2}
          aria-label={`Mark ${model.name} as ready`}
          onClick={() => onMarkReady(model.id)}
        >
          Mark Ready
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={DownloadCloud}
          aria-label={`Mark ${model.name} as indexed`}
          onClick={() => onMarkIndexed(model.id)}
        >
          Mark Indexed
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={Power}
          aria-label={`Disable ${model.name}`}
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
    <div className="rounded-[var(--nd-radius-md)] border border-nd-border-subtle bg-nd-surface-tertiary p-3">
      <p className="text-[10px] uppercase tracking-[var(--nd-tracking-hud)] text-nd-text-muted">
        {label}
      </p>
      <p className="mt-1 text-nd-text-secondary">{value || "—"}</p>
    </div>
  );
}
