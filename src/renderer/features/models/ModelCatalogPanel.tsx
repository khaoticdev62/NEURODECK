import { useState } from "react";
import { Download, ExternalLink, Filter, Loader2, Search } from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import { neurodeckApi } from "../../services/bridgeAdapter";

type ModelType = "all" | "instruct" | "code" | "vision" | "embedding";
type ModelSize = "all" | "1b-7b" | "8b-13b" | "14b+";
type Quantization = "all" | "Q4" | "Q5" | "Q8" | "F16";

interface CatalogModel {
  id: string;
  name: string;
  provider: string;
  type: Exclude<ModelType, "all">;
  sizeName: string;
  quantization: Exclude<Quantization, "all">;
  description: string;
  tags: string[];
  pullName: string;
  sizeMb: number;
  contextLength: number;
}

const CATALOG: CatalogModel[] = [
  { id: "llama3.2-1b", name: "Llama 3.2 1B", provider: "Meta", type: "instruct", sizeName: "1B", quantization: "Q4", description: "Ultra-fast local inference. Best for simple tasks and quick completions.", tags: ["fast", "lightweight"], pullName: "llama3.2:1b", sizeMb: 890, contextLength: 4096 },
  { id: "llama3.2-3b", name: "Llama 3.2 3B", provider: "Meta", type: "instruct", sizeName: "3B", quantization: "Q4", description: "Balanced performance and quality for everyday tasks.", tags: ["popular"], pullName: "llama3.2:3b", sizeMb: 2000, contextLength: 4096 },
  { id: "mistral-7b", name: "Mistral 7B", provider: "Mistral AI", type: "instruct", sizeName: "7B", quantization: "Q4", description: "Excellent instruction-following with strong reasoning capabilities.", tags: ["popular", "reasoning"], pullName: "mistral:7b-instruct-q4_K_M", sizeMb: 4100, contextLength: 8192 },
  { id: "qwen2.5-coder-7b", name: "Qwen 2.5 Coder 7B", provider: "Alibaba", type: "code", sizeName: "7B", quantization: "Q4", description: "State-of-the-art code generation across 92+ programming languages.", tags: ["code", "popular"], pullName: "qwen2.5-coder:7b", sizeMb: 4300, contextLength: 32768 },
  { id: "deepseek-coder-6.7b", name: "DeepSeek Coder 6.7B", provider: "DeepSeek", type: "code", sizeName: "7B", quantization: "Q4", description: "Strong open-source code model with competitive benchmark results.", tags: ["code"], pullName: "deepseek-coder:6.7b", sizeMb: 3800, contextLength: 16384 },
  { id: "nomic-embed", name: "Nomic Embed Text", provider: "Nomic", type: "embedding", sizeName: "137M", quantization: "F16", description: "Powerful text embeddings for semantic search and RAG pipelines.", tags: ["rag", "embedding"], pullName: "nomic-embed-text", sizeMb: 274, contextLength: 8192 },
  { id: "llava-7b", name: "LLaVA 1.6 7B", provider: "LLaVA Team", type: "vision", sizeName: "7B", quantization: "Q4", description: "Multimodal vision-language model for image understanding.", tags: ["vision", "multimodal"], pullName: "llava:7b-v1.6", sizeMb: 4500, contextLength: 4096 },
  { id: "phi3.5-mini", name: "Phi-3.5 Mini", provider: "Microsoft", type: "instruct", sizeName: "3.8B", quantization: "Q4", description: "Highly capable small model optimized for reasoning and STEM.", tags: ["reasoning", "compact"], pullName: "phi3.5:3.8b", sizeMb: 2200, contextLength: 128000 },
];

const TYPE_OPTIONS: { value: ModelType; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "instruct", label: "Instruct" },
  { value: "code", label: "Code" },
  { value: "vision", label: "Vision" },
  { value: "embedding", label: "Embedding" },
];

const SIZE_OPTIONS: { value: ModelSize; label: string }[] = [
  { value: "all", label: "Any Size" },
  { value: "1b-7b", label: "1B–7B" },
  { value: "8b-13b", label: "8B–13B" },
  { value: "14b+", label: "14B+" },
];

const QUANT_OPTIONS: { value: Quantization; label: string }[] = [
  { value: "all", label: "Any Quant" },
  { value: "Q4", label: "Q4" },
  { value: "Q5", label: "Q5" },
  { value: "Q8", label: "Q8" },
  { value: "F16", label: "F16" },
];

type PullState = "idle" | "pulling" | "done" | "error";

interface ModelCatalogPanelProps {
  onImported?: () => void;
}

export function ModelCatalogPanel({ onImported }: ModelCatalogPanelProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ModelType>("all");
  const [filterSize, setFilterSize] = useState<ModelSize>("all");
  const [filterQuant, setFilterQuant] = useState<Quantization>("all");
  const [pullState, setPullState] = useState<Record<string, PullState>>({});
  const [showFilters, setShowFilters] = useState(false);

  const filtered = CATALOG.filter((m) => {
    const q = search.toLowerCase();
    if (q && !m.name.toLowerCase().includes(q) && !m.description.toLowerCase().includes(q) && !m.tags.some((t) => t.includes(q))) return false;
    if (filterType !== "all" && m.type !== filterType) return false;
    if (filterSize !== "all") {
      if (filterSize === "1b-7b" && m.sizeMb > 5000) return false;
      if (filterSize === "8b-13b" && (m.sizeMb < 4000 || m.sizeMb > 9000)) return false;
      if (filterSize === "14b+" && m.sizeMb < 8000) return false;
    }
    if (filterQuant !== "all" && m.quantization !== filterQuant) return false;
    return true;
  });

  const handlePull = async (model: CatalogModel) => {
    setPullState((prev) => ({ ...prev, [model.id]: "pulling" }));
    try {
      const ollamaApi = (neurodeckApi as unknown as { ollama?: { pull?: (name: string) => Promise<{ ok: boolean }> } }).ollama;
      await ollamaApi?.pull?.(model.pullName);
      setPullState((prev) => ({ ...prev, [model.id]: "done" }));
      onImported?.();
    } catch {
      setPullState((prev) => ({ ...prev, [model.id]: "error" }));
    }
  };

  const TYPE_BADGE: Record<string, "neutral" | "accent" | "success" | "warning" | "danger"> = {
    instruct: "accent",
    code: "success",
    vision: "warning",
    embedding: "neutral",
  };

  return (
    <Panel
      eyebrow="Models"
      title="Model Catalog"
      data-testid="model-catalog-panel"
      className="h-full min-h-0 overflow-hidden"
      scrollable={false}
      action={
        <Button
          variant="ghost"
          size="sm"
          icon={Filter}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-controls="catalog-filters"
        >
          Filters
        </Button>
      }
    >
      <div className="flex h-full flex-col gap-3 overflow-hidden p-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nd-text-muted" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models…"
            className="nd-input w-full pl-9"
            aria-label="Search model catalog"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div
            id="catalog-filters"
            className="flex flex-wrap gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-3"
          >
            <FilterGroup
              label="Type"
              options={TYPE_OPTIONS}
              value={filterType}
              onChange={(v) => setFilterType(v as ModelType)}
            />
            <FilterGroup
              label="Size"
              options={SIZE_OPTIONS}
              value={filterSize}
              onChange={(v) => setFilterSize(v as ModelSize)}
            />
            <FilterGroup
              label="Quantization"
              options={QUANT_OPTIONS}
              value={filterQuant}
              onChange={(v) => setFilterQuant(v as Quantization)}
            />
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-nd-text-muted" aria-live="polite">
          {filtered.length} of {CATALOG.length} models
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No models match"
            description="Try adjusting your search or filters."
          />
        ) : (
          <ul
            className="grid flex-1 auto-rows-max gap-3 overflow-y-auto pb-2 scrollbar-thin sm:grid-cols-2"
            role="list"
            aria-label="Available models"
          >
            {filtered.map((model) => {
              const state = pullState[model.id] ?? "idle";
              return (
                <li
                  key={model.id}
                  className="flex flex-col justify-between rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-4 hover:border-nd-accent-primary/30 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-nd-text-primary">{model.name}</p>
                        <p className="text-xs text-nd-text-muted">{model.provider}</p>
                      </div>
                      <Badge tone={TYPE_BADGE[model.type] ?? "neutral"}>{model.type}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-nd-text-secondary line-clamp-2">
                      {model.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-nd-text-muted">
                      <span>{model.sizeName}</span>
                      <span>·</span>
                      <span>{model.quantization}</span>
                      <span>·</span>
                      <span>{(model.sizeMb / 1024).toFixed(1)} GB</span>
                      <span>·</span>
                      <span>{(model.contextLength / 1000).toFixed(0)}K ctx</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {model.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-nd-border-subtle px-2 py-0.5 text-xs text-nd-text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <StatusChip
                      tone={state === "done" ? "success" : state === "error" ? "error" : "info"}
                      size="sm"
                    >
                      {state === "done" ? "Installed" : state === "error" ? "Failed" : state === "pulling" ? "Pulling…" : "Available"}
                    </StatusChip>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={ExternalLink}
                        aria-label={`Open ${model.name} on Ollama Hub`}
                      />
                      <Button
                        variant={state === "done" ? "secondary" : "primary"}
                        size="sm"
                        disabled={state === "pulling" || state === "done"}
                        onClick={() => void handlePull(model)}
                        aria-label={`Pull ${model.name} via Ollama`}
                      >
                        {state === "pulling" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : state === "done" ? (
                          "Installed"
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" aria-hidden />
                            Pull
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-nd-text-muted">{label}</p>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
              value === opt.value
                ? "bg-nd-accent-primary/20 text-nd-accent-primary"
                : "border border-nd-border-subtle text-nd-text-muted hover:text-nd-text-primary"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
