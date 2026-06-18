import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch } from "react";
import {
  BookOpen,
  Copy,
  Download,
  Edit2,
  Plus,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { IconButton } from "../../components/primitives/IconButton";
import { Panel } from "../../components/primitives/Panel";
import { Skeleton } from "../../components/primitives/Skeleton";
import { TextInput } from "../../components/primitives/TextInput";
import { bridgeInvoke, neurodeckApi, type SavedPrompt } from "../../services/bridgeAdapter";
import { useToast } from "../../components/primitives/Toast";
import type { NeuroDeckAction, NeuroDeckState, ViewId } from "../../types/neurodeck";

type CategoryId = "all" | "favorites" | "code" | "research" | "writing" | "analysis" | "custom";

interface PromptMeta {
  favorite?: boolean;
  tags?: string[];
  usage_count?: number;
}

type PromptMetaMap = Record<string, PromptMeta>;

interface LibraryPrompt extends SavedPrompt {
  favorite: boolean;
  tags: string[];
  usage_count: number;
  category: CategoryId;
}

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "code", label: "Code" },
  { id: "research", label: "Research" },
  { id: "writing", label: "Writing" },
  { id: "analysis", label: "Analysis" },
  { id: "custom", label: "Custom" },
];

const META_KEY = "nd:prompt-library-meta";
const DELETED_KEY = "nd:prompt-library-deleted";

const CODE_TERMS =
  /\b(code|coding|function|class|script|program|programming|debug|refactor|implement|api|javascript|python|rust|typescript|bash|shell|sql|html|css|regex|algorithm|module|library)\b/i;
const RESEARCH_TERMS =
  /\b(research|investigate|explore|find|source|reference|literature|study|survey|compare)\b/i;
const ANALYSIS_TERMS =
  /\b(analyz|evaluat|assess|review|audit|break down|compare|pros? and cons?|swot)\b/i;
const WRITING_TERMS =
  /\b(write|draft|essay|story|article|blog|email|letter|copy|content|narrative|compose)\b/i;

function loadMeta(): PromptMetaMap {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as PromptMetaMap) : {};
  } catch {
    return {};
  }
}

function saveMeta(meta: PromptMetaMap) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function loadDeleted(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveDeleted(ids: string[]) {
  localStorage.setItem(DELETED_KEY, JSON.stringify(ids));
}

function detectCategory(prompt: SavedPrompt, tags: string[]): CategoryId {
  const text = `${prompt.title} ${prompt.prompt} ${tags.join(" ")}`;
  if (tags.some((t) => ["code", "coding", "dev"].includes(t.toLowerCase())) || CODE_TERMS.test(text)) {
    return "code";
  }
  if (
    tags.some((t) => ["research"].includes(t.toLowerCase())) ||
    RESEARCH_TERMS.test(text)
  ) {
    return "research";
  }
  if (
    tags.some((t) => ["writing", "write"].includes(t.toLowerCase())) ||
    WRITING_TERMS.test(text)
  ) {
    return "writing";
  }
  if (
    tags.some((t) => ["analysis", "analyze"].includes(t.toLowerCase())) ||
    ANALYSIS_TERMS.test(text)
  ) {
    return "analysis";
  }
  return "custom";
}

function previewText(text: string): string {
  const lines = text.split("\n").filter((line) => line.trim());
  const head = lines.slice(0, 2).join("\n");
  const tail = lines.length > 2 || text.length > head.length + 1 ? "…" : "";
  return head + tail;
}

function categoryCount(prompts: LibraryPrompt[], category: CategoryId): number {
  if (category === "all") return prompts.length;
  if (category === "favorites") return prompts.filter((p) => p.favorite).length;
  return prompts.filter((p) => p.category === category).length;
}

export function PromptLibraryView({
  state: _state,
  dispatch,
}: {
  state?: NeuroDeckState;
  dispatch?: Dispatch<NeuroDeckAction>;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [prompts, setPrompts] = useState<LibraryPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const saved = await neurodeckApi.promptDrive.listSavedPrompts();
      const meta = loadMeta();
      const deleted = new Set(loadDeleted());
      const merged: LibraryPrompt[] = saved
        .filter((p) => !deleted.has(p.id))
        .map((p) => {
          const m = meta[p.id] ?? {};
          const tags = m.tags ?? [];
          return {
            ...p,
            favorite: m.favorite ?? false,
            tags,
            usage_count: m.usage_count ?? 0,
            category: detectCategory(p, tags),
          };
        });
      setPrompts(merged);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrompts();
  }, [loadPrompts]);

  const filteredPrompts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prompts.filter((p) => {
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      const matchesCategory =
        activeCategory === "all" ||
        (activeCategory === "favorites" && p.favorite) ||
        p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [prompts, search, activeCategory]);

  const insertPrompt = useCallback(
    (prompt: LibraryPrompt) => {
      dispatch?.({ type: "set-composer", value: prompt.prompt });
      dispatch?.({ type: "set-view", view: "chat" });
      const meta = loadMeta();
      const current = meta[prompt.id] ?? {};
      meta[prompt.id] = {
        ...current,
        usage_count: (current.usage_count ?? 0) + 1,
      };
      saveMeta(meta);
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === prompt.id ? { ...p, usage_count: p.usage_count + 1 } : p
        )
      );
    },
    [dispatch]
  );

  const editPrompt = useCallback(
    (prompt: LibraryPrompt) => {
      localStorage.setItem("nd:prompt-builder-edit", JSON.stringify(prompt));
      dispatch?.({
        type: "set-view",
        view: "prompt-builder" as unknown as ViewId,
      });
    },
    [dispatch]
  );

  const duplicatePrompt = useCallback(async (prompt: LibraryPrompt) => {
    try {
      await neurodeckApi.promptDrive.savePrompt({
        title: `Copy of ${prompt.title}`,
        prompt: prompt.prompt,
        slot_values: prompt.slot_values ?? {},
      });
      await loadPrompts();
      toast("Prompt duplicated", "success");
    } catch (e) {
      toast(`Duplicate failed: ${String(e)}`, "error");
    }
  }, [loadPrompts, toast]);

  const toggleFavorite = useCallback((prompt: LibraryPrompt) => {
    const meta = loadMeta();
    const current = meta[prompt.id] ?? {};
    meta[prompt.id] = { ...current, favorite: !prompt.favorite };
    saveMeta(meta);
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === prompt.id ? { ...p, favorite: !p.favorite } : p
      )
    );
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleteId(null);
      try {
        await bridgeInvoke("promptdrive_delete_saved_prompt", { id });
        await loadPrompts();
        toast("Prompt deleted", "success");
      } catch {
        const deleted = loadDeleted();
        if (!deleted.includes(id)) {
          saveDeleted([...deleted, id]);
          setPrompts((prev) => prev.filter((p) => p.id !== id));
        }
        toast("Server delete unavailable; removed locally", "warning");
      }
    },
    [loadPrompts, toast]
  );

  const exportPrompts = useCallback(() => {
    const meta = loadMeta();
    const payload = prompts.map((p) => ({
      ...p,
      meta: meta[p.id] ?? {},
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neurodeck-prompts-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Prompts exported", "success");
  }, [prompts, toast]);

  const importPrompts = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        if (!Array.isArray(parsed)) throw new Error("Expected array");
        const meta = loadMeta();
        let count = 0;
        for (const item of parsed) {
          if (!item || typeof item !== "object") continue;
          const record = item as Record<string, unknown>;
          const title = String(record.title ?? "");
          const promptText = String(record.prompt ?? "");
          if (!title || !promptText) continue;
          const saved = await neurodeckApi.promptDrive.savePrompt({
            title,
            prompt: promptText,
            slot_values: {},
          });
          const itemMeta = record.meta as PromptMeta | undefined;
          if (itemMeta) {
            meta[saved.id] = itemMeta;
          }
          count++;
        }
        saveMeta(meta);
        await loadPrompts();
        toast(`Imported ${count} prompts`, "success");
      } catch (e) {
        toast(`Import failed: ${String(e)}`, "error");
      }
    },
    [loadPrompts, toast]
  );

  const activePrompt = useMemo(
    () => prompts.find((p) => p.id === deleteId) ?? null,
    [prompts, deleteId]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <header className="mb-4 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
          <BookOpen className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
            PromptDrive
          </p>
          <h2 className="text-lg font-semibold text-nd-text-primary">Prompt Library</h2>
          <p className="text-xs text-nd-text-muted">
            Save, organize, and reuse your best prompts.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={Download}
            onClick={exportPrompts}
            disabled={prompts.length === 0}
          >
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={Upload}
            onClick={() => fileInputRef.current?.click()}
          >
            Import
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={Plus}
            onClick={() =>
              dispatch?.({
                type: "set-view",
                view: "prompt-builder" as unknown as ViewId,
              })
            }
          >
            New Prompt
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importPrompts(file);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      {error && (
        <ErrorState
          title="Failed to load prompts"
          message={error}
          onRetry={() => void loadPrompts()}
          onClose={() => setError(null)}
        />
      )}

      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              size="xs"
              variant={activeCategory === cat.id ? "primary" : "ghost"}
              onClick={() => setActiveCategory(cat.id)}
              aria-pressed={activeCategory === cat.id}
            >
              {cat.label}
              <span className="ml-1 opacity-70">{categoryCount(prompts, cat.id)}</span>
            </Button>
          ))}
        </div>
        <TextInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prompts, tags, or text..."
          className="w-full lg:w-72"
        />
      </div>

      <Panel className="min-h-0 flex-1 overflow-hidden" scrollable>
        {loading ? (
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex h-40 flex-col gap-2 rounded-xl border border-nd-border-subtle p-3"
              >
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="mt-auto flex gap-2">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPrompts.length === 0 ? (
          <EmptyState
            variant="deck"
            icon={BookOpen}
            title="No prompts found"
            description={
              prompts.length === 0
                ? "Save your first prompt from the builder or import a JSON collection."
                : "Try a different search term or category filter."
            }
            action={
              prompts.length === 0 ? (
                <Button
                  variant="primary"
                  icon={Plus}
                  onClick={() =>
                    dispatch?.({
                      type: "set-view",
                      view: "prompt-builder" as unknown as ViewId,
                    })
                  }
                >
                  Create Prompt
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="flex flex-col gap-2 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary p-3 transition hover:border-nd-border-strong"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate font-medium text-nd-text-primary">
                    {prompt.title}
                  </h3>
                  <IconButton
                    aria-label={prompt.favorite ? "Remove favorite" : "Add favorite"}
                    variant={prompt.favorite ? "accent" : "ghost"}
                    size="sm"
                    onClick={() => toggleFavorite(prompt)}
                    aria-pressed={prompt.favorite}
                  >
                    <Star
                      className="h-4 w-4"
                      fill={prompt.favorite ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  </IconButton>
                </div>

                <p className="line-clamp-2 whitespace-pre-line text-xs text-nd-text-muted">
                  {previewText(prompt.prompt)}
                </p>

                {prompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {prompt.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} tone="accent" variant="outline" size="sm">
                        {tag}
                      </Badge>
                    ))}
                    {prompt.tags.length > 4 && (
                      <Badge tone="neutral" variant="outline" size="sm">
                        +{prompt.tags.length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-nd-border-subtle pt-2">
                  <span className="text-xs text-nd-text-muted">
                    Used {prompt.usage_count} times
                  </span>
                  <div className="flex items-center gap-1">
                    <Button size="xs" variant="ghost" onClick={() => insertPrompt(prompt)}>
                      Insert
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={Edit2}
                      onClick={() => editPrompt(prompt)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={Copy}
                      onClick={() => duplicatePrompt(prompt)}
                    >
                      Duplicate
                    </Button>
                    <IconButton
                      aria-label={`Delete ${prompt.title}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(prompt.id)}
                    >
                      <Trash2 className="h-4 w-4 text-nd-accent-error" aria-hidden="true" />
                    </IconButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={!!activePrompt}
        onConfirm={() => activePrompt && void handleDelete(activePrompt.id)}
        onCancel={() => setDeleteId(null)}
        title="Delete prompt?"
        message={`Remove "${activePrompt?.title ?? ""}" from your library?`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
