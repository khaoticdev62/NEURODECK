import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch } from "react";
import { Check, Eraser, MessageSquare, Save, Sparkles } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { FormSection } from "../../components/primitives/FormSection";
import { Modal } from "../../components/primitives/Modal";
import { Panel } from "../../components/primitives/Panel";
import { Select } from "../../components/primitives/Select";
import { TextInput } from "../../components/primitives/TextInput";
import { neurodeckApi, type SavedPrompt } from "../../services/bridgeAdapter";
import { useToast } from "../../components/primitives/Toast";
import type { NeuroDeckAction, NeuroDeckState } from "../../types/neurodeck";

type OutputFormat = "prose" | "bullet" | "numbered" | "code" | "table" | "json";
type Tone = "professional" | "casual" | "technical" | "creative" | "academic";
type ToolId = "web_search" | "bash" | "memory" | "file_read";

interface BuilderState {
  goal: string;
  context: string;
  format: OutputFormat;
  tone: Tone;
  constraints: string;
  tools: Record<ToolId, boolean>;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: "prose", label: "Prose" },
  { value: "bullet", label: "Bullet list" },
  { value: "numbered", label: "Numbered list" },
  { value: "code", label: "Code" },
  { value: "table", label: "Table" },
  { value: "json", label: "JSON" },
];

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "technical", label: "Technical" },
  { value: "creative", label: "Creative" },
  { value: "academic", label: "Academic" },
];

const TOOLS: { id: ToolId; label: string }[] = [
  { id: "web_search", label: "Web search" },
  { id: "bash", label: "Bash" },
  { id: "memory", label: "Memory" },
  { id: "file_read", label: "File read" },
];

const DEFAULT_STATE: BuilderState = {
  goal: "",
  context: "",
  format: "prose",
  tone: "professional",
  constraints: "",
  tools: {
    web_search: false,
    bash: false,
    memory: false,
    file_read: false,
  },
};

function formatLabel(value: OutputFormat): string {
  return FORMAT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function toneLabel(value: Tone): string {
  return TONE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function assemblePrompt(state: BuilderState): string {
  const parts: string[] = [];
  if (state.goal.trim()) parts.push(state.goal.trim());
  if (state.context.trim()) parts.push(`Context:\n${state.context.trim()}`);
  parts.push(`Output Format: ${formatLabel(state.format)}`);
  parts.push(`Tone: ${toneLabel(state.tone)}`);
  if (state.constraints.trim()) parts.push(`Constraints:\n${state.constraints.trim()}`);
  const enabled = TOOLS.filter((t) => state.tools[t.id]).map((t) => t.label);
  if (enabled.length > 0) parts.push(`Allowed Tools: ${enabled.join(", ")}`);
  return parts.join("\n\n");
}

function tokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.35));
}

function updateMetaTags(promptId: string, tags: string[]) {
  try {
    const raw = localStorage.getItem("nd:prompt-library-meta");
    const meta = raw ? (JSON.parse(raw) as Record<string, { tags?: string[] }>) : {};
    meta[promptId] = { ...(meta[promptId] ?? {}), tags };
    localStorage.setItem("nd:prompt-library-meta", JSON.stringify(meta));
  } catch {
    // ignore
  }
}

export function PromptBuilderView({
  state: _state,
  dispatch,
}: {
  state?: NeuroDeckState;
  dispatch?: Dispatch<NeuroDeckAction>;
}) {
  const { toast } = useToast();
  const [builder, setBuilder] = useState<BuilderState>(DEFAULT_STATE);
  const [assembled, setAssembled] = useState("");
  const [goalError, setGoalError] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveTags, setSaveTags] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("nd:prompt-builder-edit");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as SavedPrompt;
      setBuilder((prev) => ({ ...prev, goal: parsed.prompt ?? "" }));
    } catch {
      // ignore malformed edit payload
    }
  }, []);

  const assemble = useCallback(() => assemblePrompt(builder), [builder]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setAssembled(assemble()), 100);
    return () => window.clearTimeout(timeout);
  }, [assemble]);

  const tokens = useMemo(() => tokenCount(assembled), [assembled]);

  const updateField = useCallback(<K extends keyof BuilderState>(key: K, value: BuilderState[K]) => {
    setBuilder((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleTool = useCallback((toolId: ToolId) => {
    setBuilder((prev) => ({
      ...prev,
      tools: { ...prev.tools, [toolId]: !prev.tools[toolId] },
    }));
  }, []);

  const validateGoal = useCallback((): boolean => {
    const ok = builder.goal.trim().length > 0;
    setGoalError(!ok);
    return ok;
  }, [builder.goal]);

  const sendToChat = useCallback(() => {
    if (!validateGoal()) return;
    dispatch?.({ type: "set-composer", value: assembled });
    dispatch?.({ type: "set-view", view: "chat" });
  }, [assembled, dispatch, validateGoal]);

  const saveTemplate = useCallback(async () => {
    if (!validateGoal()) return;
    const name = saveName.trim();
    if (!name) {
      setGoalError(true);
      return;
    }
    try {
      const saved = await neurodeckApi.promptDrive.savePrompt({
        title: name,
        prompt: assembled,
        slot_values: {},
      });
      const tags = saveTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tags.length > 0) {
        updateMetaTags(saved.id, tags);
      }
      setShowSaveModal(false);
      setSaveName("");
      setSaveTags("");
      toast("Template saved to library", "success");
    } catch (e) {
      toast(`Save failed: ${String(e)}`, "error");
    }
  }, [assembled, saveName, saveTags, toast, validateGoal]);

  const clearAll = useCallback(() => {
    setBuilder(DEFAULT_STATE);
    setGoalError(false);
    setShowClearConfirm(false);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <header className="mb-4 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
          <Sparkles className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
            PromptDrive
          </p>
          <h2 className="text-lg font-semibold text-nd-text-primary">Prompt Builder</h2>
          <p className="text-xs text-nd-text-muted">
            Assemble focused prompts from goal, context, format, and constraints.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={Eraser}
            onClick={() => setShowClearConfirm(true)}
          >
            Clear
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={Save}
            onClick={() => setShowSaveModal(true)}
          >
            Save Template
          </Button>
          <Button size="sm" variant="primary" icon={MessageSquare} onClick={sendToChat}>
            Send to Chat
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,55%)_minmax(0,45%)]">
        <Panel className="min-h-0 overflow-hidden" scrollable>
          <div className="space-y-5 p-4">
            <FormSection title="Goal" description="What should the model do? (required)">
              <textarea
                id="pb-goal"
                value={builder.goal}
                onChange={(e) => {
                  setGoalError(false);
                  updateField("goal", e.target.value);
                }}
                rows={4}
                aria-invalid={goalError}
                aria-describedby={goalError ? "pb-goal-error" : undefined}
                placeholder="e.g. Summarize the following article in two sentences."
                className="min-h-touch w-full resize-none rounded-xl border border-nd-border-subtle bg-nd-surface-app px-3 py-2 text-sm text-nd-text-primary outline-none focus:border-nd-accent-primary/40 focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40"
              />
              {goalError && (
                <p id="pb-goal-error" role="alert" className="text-xs text-nd-accent-error">
                  Goal is required before sending or saving.
                </p>
              )}
            </FormSection>

            <FormSection title="Context" description="Background information the model needs.">
              <textarea
                id="pb-context"
                value={builder.context}
                onChange={(e) => updateField("context", e.target.value)}
                rows={3}
                placeholder="Paste content, constraints, or prior conversation context..."
                className="min-h-touch w-full resize-none rounded-xl border border-nd-border-subtle bg-nd-surface-app px-3 py-2 text-sm text-nd-text-primary outline-none focus:border-nd-accent-primary/40 focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40"
              />
            </FormSection>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                id="pb-format"
                label="Output Format"
                value={builder.format}
                onChange={(e) => updateField("format", e.target.value as OutputFormat)}
                options={FORMAT_OPTIONS}
                fullWidth
              />
              <Select
                id="pb-tone"
                label="Tone"
                value={builder.tone}
                onChange={(e) => updateField("tone", e.target.value as Tone)}
                options={TONE_OPTIONS}
                fullWidth
              />
            </div>

            <FormSection title="Constraints" description="Length, style, or content limits.">
              <textarea
                id="pb-constraints"
                value={builder.constraints}
                onChange={(e) => updateField("constraints", e.target.value)}
                rows={3}
                placeholder="e.g. Keep it under 200 words; avoid jargon."
                className="min-h-touch w-full resize-none rounded-xl border border-nd-border-subtle bg-nd-surface-app px-3 py-2 text-sm text-nd-text-primary outline-none focus:border-nd-accent-primary/40 focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40"
              />
            </FormSection>

            <FormSection
              title="Tool Permissions"
              description="Allow the agent to use these tools for this prompt."
            >
              <div className="flex flex-wrap gap-2">
                {TOOLS.map((tool) => {
                  const enabled = builder.tools[tool.id];
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => toggleTool(tool.id)}
                      aria-pressed={enabled}
                      className={[
                        "flex min-h-touch items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                        enabled
                          ? "border-nd-accent-primary bg-nd-accent-primary/10 text-nd-accent-primary"
                          : "border-nd-border-subtle text-nd-text-muted hover:border-nd-border-strong hover:text-nd-text-primary",
                      ].join(" ")}
                    >
                      {enabled && <Check className="h-3 w-3" aria-hidden="true" />}
                      {tool.label}
                    </button>
                  );
                })}
              </div>
            </FormSection>
          </div>
        </Panel>

        <Panel
          className="flex min-h-0 flex-col overflow-hidden"
          scrollable
          eyebrow="Preview"
          title="Assembled Prompt"
          action={
            <span className="text-xs text-nd-text-muted">~{tokens} tokens</span>
          }
        >
          <textarea
            id="pb-preview"
            value={assembled}
            onChange={(e) => setAssembled(e.target.value)}
            aria-label="Assembled prompt preview"
            className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm text-nd-text-primary/90 outline-none"
          />
          <div className="flex items-center justify-between gap-3 border-t border-nd-border-subtle px-4 py-3">
            <span className="text-xs text-nd-text-muted">
              {assembled.trim().length === 0
                ? "Start typing to build your prompt."
                : "Preview updates automatically."}
            </span>
            <Button size="sm" variant="primary" icon={MessageSquare} onClick={sendToChat}>
              Send to Chat
            </Button>
          </div>
        </Panel>
      </div>

      <Modal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save Template"
        description="Name your prompt and add comma-separated tags."
        size="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowSaveModal(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" icon={Save} onClick={() => void saveTemplate()}>
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <TextInput
            id="pb-save-name"
            label="Template Name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="e.g. Bug Report Summarizer"
            required
            fullWidth
          />
          <TextInput
            id="pb-save-tags"
            label="Tags"
            value={saveTags}
            onChange={(e) => setSaveTags(e.target.value)}
            placeholder="code, debugging, summary"
            hint="Comma-separated"
            fullWidth
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={showClearConfirm}
        onConfirm={clearAll}
        onCancel={() => setShowClearConfirm(false)}
        title="Clear builder?"
        message="This will remove all fields and reset the preview."
        confirmLabel="Clear"
        destructive
      />
    </div>
  );
}
