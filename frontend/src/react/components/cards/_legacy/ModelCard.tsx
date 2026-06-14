import { BrainCircuit, CheckCircle2, DownloadCloud, Power } from "lucide-react";
import { Badge } from "../primitives/Badge";
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

const statusTone: Record<ModelStatus, "accent" | "success" | "warning" | "neutral" | "danger"> = {
  ready: "success",
  indexed: "accent",
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
  return (
    <article
      className={`rounded-3xl border p-4 transition hover:border-nd-accent/30 ${
        selected
          ? "border-nd-accent/40 bg-nd-accent/[0.07]"
          : policyAllowed === false
            ? "border-nd-danger/25 bg-nd-danger/[0.04]"
            : "border-nd-text-muted/15 bg-nd-surface/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-nd-accent ${policyAllowed === false ? "border-nd-danger/25 bg-nd-danger/10 text-nd-danger" : "border-nd-accent/25 bg-nd-accent/10"}`}
          >
            <BrainCircuit className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-nd-text">{model.name}</h3>
            <p className="text-xs text-nd-text-muted">
              {model.provider} · {model.size} · {model.quantization}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={statusTone[model.status]}>{model.status}</Badge>
          {agentPreferred && <Badge tone="accent">Preferred</Badge>}
          {policyAllowed === false && <Badge tone="danger">Blocked</Badge>}
          {selected && <Badge tone="accent">Selected</Badge>}
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
        <p className="mt-3 rounded-xl border border-nd-danger/20 bg-nd-danger/10 px-3 py-2 text-xs text-nd-danger/90">
          {policyReason}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={policyAllowed === false}
          onClick={() => {
            onMarkReady(model.id);
            onSelect(model.id);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-nd-success/25 bg-nd-success/10 px-3 py-2 text-xs font-semibold text-nd-success transition hover:bg-nd-success/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-success/40 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Mark Ready
        </button>
        <button
          type="button"
          onClick={() => {
            onMarkIndexed(model.id);
            onSelect(model.id);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-xs font-semibold text-nd-accent transition hover:bg-nd-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          <DownloadCloud className="h-4 w-4" aria-hidden="true" /> Indexed
        </button>
        <button
          type="button"
          onClick={() => onDisable(model.id)}
          className="inline-flex items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/50 px-3 py-2 text-xs font-semibold text-nd-text-muted transition hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-text-muted/40"
        >
          <Power className="h-4 w-4" aria-hidden="true" /> Disable
        </button>
      </div>
    </article>
  );
}

function ModelSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-nd-text-muted/70">{label}</p>
      <p className="mt-1 text-nd-text/80">{value}</p>
    </div>
  );
}
