import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Play, RotateCcw, Save, Sparkles, Square, Trash2 } from "lucide-react";
import {
  neurodeckApi,
  listenBridge,
  type MacroDefinition,
  type MacroStep,
  type PromptPack,
  type PromptPreview,
  type PromptTemplate,
  type SavedPrompt,
  type Suggestion,
} from "../../services/bridgeAdapter";
import { Button } from "../../components/primitives/Button";
import { ErrorState } from "../../components/primitives/ErrorState";
import { IconButton } from "../../components/primitives/IconButton";
import { Badge } from "../../components/primitives/Badge";
import { Panel } from "../../components/primitives/Panel";
import { Select } from "../../components/primitives/Select";
import { TextInput } from "../../components/primitives/TextInput";


type SlotValues = Record<string, string>;

function tokenCount(text: string) {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.35));
}

function defaultValues(template: PromptTemplate | null): SlotValues {
  const values: SlotValues = {};
  for (const slot of template?.slots ?? []) {
    values[slot.id] = slot.default ?? "";
  }
  return values;
}

function macroStep(kind: string, payload: Record<string, unknown>): MacroStep {
  return {
    kind,
    timestamp: new Date().toISOString(),
    payload,
    requires_confirmation: false,
  };
}

export function PromptLabView() {
  const [packs, setPacks] = useState<PromptPack[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedPackId, setSelectedPackId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [slotValues, setSlotValues] = useState<SlotValues>({});
  const [preview, setPreview] = useState<PromptPreview | null>(null);
  const [previewText, setPreviewText] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [macros, setMacros] = useState<MacroDefinition[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordedSteps, setRecordedSteps] = useState<MacroStep[]>([]);
  const [status, setStatus] = useState("Loading PromptDrive...");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const valid = preview?.valid ?? false;
  const selectedSlotId = selectedTemplate?.slots[0]?.id;

  const recordStep = useCallback(
    (step: MacroStep) => {
      setRecordedSteps((current) => (recordingId ? [...current, step] : current));
    },
    [recordingId]
  );

  const refreshSaved = useCallback(async () => {
    try {
      setSavedPrompts(await neurodeckApi.promptDrive.listSavedPrompts());
    } catch (e) {
      setLoadError(`Failed to load saved prompts: ${String(e)}`);
    }
  }, []);

  const refreshMacros = useCallback(async () => {
    try {
      setMacros(await neurodeckApi.promptDrive.listMacros());
    } catch (e) {
      setLoadError(`Failed to load macros: ${String(e)}`);
    }
  }, []);

  const renderPreview = useCallback(async (template: PromptTemplate | null, values: SlotValues) => {
    if (!template) return;
    const result = await neurodeckApi.promptDrive.previewPrompt(template.id, values);
    setPreview(result);
    setPreviewText(result.rendered_prompt ?? "");
    setStatus(result.valid ? "Valid prompt ready." : `Missing: ${result.missing_slots.join(", ")}`);
  }, []);

  const selectTemplate = useCallback(
    async (templateId: string, record = true) => {
      try {
        const template = await neurodeckApi.promptDrive.getTemplate(templateId);
        const values = defaultValues(template);
        setSelectedTemplate(template);
        setSelectedPackId(template.pack_id);
        setSlotValues(values);
        if (record) {
          recordStep(macroStep("select_template", { template_id: template.id }));
        }
        await renderPreview(template, values);
      } catch (e) {
        setLoadError(`Failed to load template: ${String(e)}`);
      }
    },
    [recordStep, renderPreview]
  );

  const loadAll = useCallback(async (isCancelled: () => boolean) => {
    try {
      setStatus("Loading PromptDrive...");
      const loadedPacks = await neurodeckApi.promptDrive.listPacks();
      const firstPack = loadedPacks[0];
      const loadedTemplates = await neurodeckApi.promptDrive.listTemplates(firstPack?.id);
      if (isCancelled()) return;
      setPacks(loadedPacks);
      setTemplates(loadedTemplates);
      setSelectedPackId(firstPack?.id ?? loadedTemplates[0]?.pack_id ?? "");
      await refreshSaved();
      if (isCancelled()) return;
      await refreshMacros();
      if (isCancelled()) return;
      if (loadedTemplates[0]) {
        await selectTemplate(loadedTemplates[0].id, false);
      } else {
        setStatus("No PromptDrive templates found.");
      }
    } catch (error) {
      if (isCancelled()) return;
      setStatus(`PromptDrive unavailable: ${String(error)}`);
      setLoadError(`PromptDrive unavailable: ${String(error)}`);
    }
  }, [refreshMacros, refreshSaved, selectTemplate]);

  useEffect(() => {
    let cancelled = false;
    void loadAll(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const timeout = window.setTimeout(() => {
      renderPreview(selectedTemplate, slotValues).catch(() => setStatus("Preview failed."));
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [renderPreview, selectedTemplate, slotValues]);

  useEffect(() => {
    let cancelled = false;
    async function loadSuggestions() {
      if (!suggestionQuery.trim()) {
        setSuggestions([]);
        return;
      }
      const ranked = await neurodeckApi.promptDrive.getSuggestions(
        suggestionQuery,
        selectedTemplate?.id,
        selectedSlotId
      );
      if (!cancelled) setSuggestions(ranked);
    }
    loadSuggestions().catch(() => setSuggestions([]));
    return () => {
      cancelled = true;
    };
  }, [selectedSlotId, selectedTemplate?.id, suggestionQuery]);

  const filteredTemplates = useMemo(
    () => templates.filter((template) => !selectedPackId || template.pack_id === selectedPackId),
    [selectedPackId, templates]
  );

  const updateSlot = async (slotId: string, value: string, record = true) => {
    const next = { ...slotValues, [slotId]: value };
    setSlotValues(next);
    if (record) {
      recordStep(macroStep("update_slot", { slot_id: slotId, value }));
    }
    if (selectedTemplate) await renderPreview(selectedTemplate, next);
  };

  const acceptSuggestion = async (suggestion: Suggestion) => {
    const slotId = selectedSlotId ?? "topic";
    await updateSlot(slotId, suggestion.insert_text);
    recordStep(
      macroStep("accept_suggestion", { slot_id: slotId, insert_text: suggestion.insert_text })
    );
  };

  const executePrompt = async () => {
    if (!selectedTemplate || !valid || !previewText.trim()) {
      setStatus("Fill required slots before execution.");
      return;
    }
    setBusy(true);
    try {
      await neurodeckApi.promptDrive.executePrompt(selectedTemplate.id, slotValues, previewText);
      recordStep(
        macroStep("execute_prompt", {
          template_id: selectedTemplate.id,
          slot_values: slotValues,
          prompt: previewText,
        })
      );
      setStatus("Prompt execution routed through bridge.");
    } catch (e) {
      setStatus(`Execution failed: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const savePrompt = async () => {
    if (!selectedTemplate || !valid || !previewText.trim()) {
      setStatus("Preview a valid prompt before saving.");
      return;
    }
    try {
      await neurodeckApi.promptDrive.savePrompt({
        title: selectedTemplate.title,
        template_id: selectedTemplate.id,
        pack_id: selectedTemplate.pack_id,
        slot_values: slotValues,
        prompt: previewText,
      });
      await refreshSaved();
      setStatus("Prompt saved.");
    } catch (e) {
      setStatus(`Save failed: ${e}`);
    }
  };

  const toggleMacro = async () => {
    try {
      if (!recordingId) {
        const result = await neurodeckApi.promptDrive.macroStart();
        setRecordingId(result.recording_id);
        setRecordedSteps([]);
        setStatus("Macro recording started.");
        return;
      }
      const macro = await neurodeckApi.promptDrive.macroStop(
        recordingId,
        `PromptDrive Macro ${new Date().toLocaleTimeString()}`,
        recordedSteps
      );
      setRecordingId(null);
      setRecordedSteps([]);
      await refreshMacros();
      setStatus(`Saved macro: ${macro.name}`);
    } catch (e) {
      setRecordingId(null);
      setStatus(`Macro failed: ${e}`);
    }
  };

  const replayMacro = async (macroId: string) => {
    try {
      const result = await neurodeckApi.promptDrive.macroExecute(macroId);
      for (const step of result.macro.steps) {
        const payload = step.payload;
        if (step.kind === "select_template" && typeof payload.template_id === "string") {
          await selectTemplate(payload.template_id, false);
        }
        if (step.kind === "update_slot" && typeof payload.slot_id === "string") {
          await updateSlot(payload.slot_id, String(payload.value ?? ""), false);
        }
        if (step.kind === "accept_suggestion" && typeof payload.slot_id === "string") {
          await updateSlot(payload.slot_id, String(payload.insert_text ?? ""), false);
        }
        if (step.kind === "insert_saved_prompt") {
          setPreviewText(String(payload.prompt ?? ""));
        }
        if (step.kind === "execute_prompt") {
          await executePrompt();
        }
      }
      setStatus("Macro replay complete.");
    } catch (e) {
      setStatus(`Macro replay failed: ${e}`);
    }
  };

  const deleteMacro = async (macroId: string) => {
    try {
      await neurodeckApi.promptDrive.deleteMacro(macroId);
      await refreshMacros();
      setStatus("Macro deleted.");
    } catch (e) {
      setStatus(`Delete failed: ${e}`);
    }
  };

  useEffect(() => {
    return listenBridge("deckcode-action", (payload) => {
      if (typeof payload !== "string") return;
      const actionId = payload.toLowerCase();

      if (actionId.includes("r4")) {
        if (suggestions[0]) {
          void acceptSuggestion(suggestions[0]);
        }
        return;
      }

      if (actionId.includes("r5") && actionId.includes("hold")) {
        void executePrompt();
        return;
      }

      if (actionId.includes("l5") && actionId.includes("r5")) {
        void toggleMacro();
        return;
      }

      if (actionId.includes("l5")) {
        void savePrompt();
        return;
      }

      if (actionId === "b" || actionId.includes("cancel")) {
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
    });
  }, [acceptSuggestion, executePrompt, savePrompt, suggestions, toggleMacro]);

  return (
    <div className="promptdrive-composer flex h-full flex-col overflow-hidden">
      {loadError && (
        <ErrorState
          title="PromptDrive load failed"
          message={loadError}
          onRetry={() => {
            setLoadError(null);
            void loadAll(() => false);
          }}
          onClose={() => setLoadError(null)}
        />
      )}
      <header className="promptdrive-header mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
          <Sparkles className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="pl-header-kicker text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
            PromptDrive
          </p>
          <h2 className="text-lg font-semibold text-nd-text-primary">Prompt Composer</h2>
          <p className="text-xs text-nd-text-muted">
            Pack templates, validated slots, autocomplete, saved prompts, and safe macro replay.
          </p>
        </div>

        <Button
          id="pl-open-gallery-btn"
          variant="ghost"
          size="sm"
          icon={Sparkles}
          disabled
          title="Gallery — coming in a future release"
        >
          Gallery
        </Button>
        <Button
          id="pl-optimize-ai-btn"
          variant="ghost"
          size="sm"
          icon={RotateCcw}
          disabled
          title="AI Optimize — coming in a future release"
        >
          Optimize
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] gap-3 overflow-hidden">
        <Panel className="flex min-h-0 flex-col overflow-hidden" scrollable>
          <div className="grid grid-cols-2 items-start gap-3 p-3">
            <div className="min-w-0">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
                Prompt Packs
              </div>
              <div id="pd-pack-list" className="grid gap-2" role="listbox" aria-label="Prompt packs">
                {packs.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    role="option"
                    aria-selected={selectedPackId === pack.id}
                    aria-label={`${pack.title} pack`}
                    tabIndex={0}
                    onClick={() => setSelectedPackId(pack.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPackId(pack.id);
                      }
                    }}
                    className={`min-h-touch min-w-0 overflow-hidden rounded-xl border px-3.5 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40 ${selectedPackId === pack.id ? "border-nd-accent-primary/40 bg-nd-accent-primary/10 text-nd-accent-primary" : "border-nd-border-subtle bg-nd-surface-secondary text-nd-text-primary/80 hover:border-nd-border-strong"}`}
                  >
                    <span className="block truncate font-medium">{pack.title}</span>
                    <span className="block truncate text-xs leading-relaxed text-nd-text-muted">
                      {pack.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
                Templates
              </div>
              <div
                id="pd-template-list"
                className="promptdrive-template-list grid gap-2"
                role="listbox"
                aria-label="Prompt templates"
              >
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    role="option"
                    aria-selected={selectedTemplate?.id === template.id}
                    aria-label={`${template.title} template`}
                    tabIndex={0}
                    onClick={() => selectTemplate(template.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void selectTemplate(template.id);
                      }
                    }}
                    className={`promptdrive-template-card min-h-touch min-w-0 overflow-hidden rounded-xl border px-3.5 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40 ${selectedTemplate?.id === template.id ? "border-nd-accent-primary/40 bg-nd-accent-primary/10 text-nd-accent-primary active" : "border-nd-border-subtle bg-nd-surface-secondary text-nd-text-primary/80 hover:border-nd-border-strong"}`}
                  >
                    <span className="block truncate font-medium">{template.title}</span>
                    <span className="block truncate text-xs leading-relaxed text-nd-text-muted">
                      {template.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-3 mb-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div
                  id="pd-template-title"
                  className="truncate text-sm font-semibold text-nd-text-primary"
                >
                  {selectedTemplate?.title ?? "Select a template"}
                </div>
                <div
                  id="pd-template-desc"
                  className="mt-1 line-clamp-2 text-xs leading-relaxed text-nd-text-muted"
                >
                  {selectedTemplate?.description ??
                    "Choose a pack and template to start composing."}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1 items-end">
                <span id="pd-risk-badge">
                  <Badge tone="success" variant="outline" size="sm">
                    {selectedTemplate?.risk_level ?? "low"}
                  </Badge>
                </span>
                {selectedTemplate?.requires_confirmation && (
                  <Badge tone="warning" variant="outline" size="sm">
                    confirm
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mx-3 mb-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
                Required Slots
              </span>
              <span
                id="pd-validation-status"
                className={`truncate text-xs ${valid ? "text-nd-accent-success" : "text-nd-accent-warning"}`}
              >
                {valid ? "Valid" : status}
              </span>
            </div>
            <div id="pd-slot-editor" className="grid gap-2">
              {(selectedTemplate?.slots ?? []).map((slot) => (
                <label
                  key={slot.id}
                  htmlFor={`pd-slot-${slot.id}`}
                  className="block rounded-xl border border-nd-border-subtle bg-nd-surface-secondary p-3"
                >
                  <span className="mb-1 flex items-center justify-between text-xs font-medium text-nd-text-muted">
                    {slot.label}
                    {slot.required && <span className="text-nd-accent-warning">Required</span>}
                  </span>
                  {slot.kind === "textarea" ? (
                    <textarea
                      id={`pd-slot-${slot.id}`}
                      value={slotValues[slot.id] ?? ""}
                      onChange={(event) => updateSlot(slot.id, event.target.value)}
                      rows={3}
                      aria-label={slot.label}
                      className="min-h-touch w-full resize-none rounded-xl border border-nd-border-subtle bg-nd-surface-app px-3 py-2 text-sm text-nd-text-primary outline-none focus:border-nd-accent-primary/40 focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40"
                    />
                  ) : slot.kind === "select" && slot.options && slot.options.length > 0 ? (
                    <Select
                      id={`pd-slot-${slot.id}`}
                      value={slotValues[slot.id] ?? slot.default ?? ""}
                      onChange={(event) => updateSlot(slot.id, event.target.value)}
                      options={slot.options.map((opt) => ({ value: opt, label: opt }))}
                      fullWidth
                    />
                  ) : (
                    <TextInput
                      id={`pd-slot-${slot.id}`}
                      type="text"
                      value={slotValues[slot.id] ?? ""}
                      onChange={(event) => updateSlot(slot.id, event.target.value)}
                      fullWidth
                    />
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="mx-3 mb-3 flex flex-wrap gap-2">
            <Button
              id="pd-execute-btn"
              variant="primary"
              onClick={executePrompt}
              loading={busy}
              disabled={!valid}
              icon={Play}
            >
              Execute
            </Button>
            <Button
              id="pd-save-btn"
              variant="success"
              onClick={savePrompt}
              disabled={!valid}
              icon={Save}
            >
              Save Prompt
            </Button>
            <Button
              id="pd-macro-toggle-btn"
              variant={recordingId ? "danger" : "secondary"}
              onClick={toggleMacro}
              icon={recordingId ? Square : RotateCcw}
            >
              {recordingId ? "Stop Macro" : "Record Macro"}
            </Button>
          </div>

          <div className="mx-3 mb-3 grid min-h-[110px] grid-cols-2 gap-3">
            <Panel eyebrow="Saved" title="Saved Prompts" className="min-h-0">
              <div
                id="pd-saved-list"
                className="promptdrive-saved-list grid max-h-28 gap-2 overflow-auto"
                tabIndex={0}
                aria-label="Saved prompts"
              >
                {savedPrompts.length ? (
                  savedPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      aria-label={`Load saved prompt: ${prompt.title}`}
                      tabIndex={0}
                      onClick={() => setPreviewText(prompt.prompt)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPreviewText(prompt.prompt);
                        }
                      }}
                      className="promptdrive-saved-item min-h-touch min-w-0 overflow-hidden rounded-lg border border-nd-border-subtle px-2.5 py-2 text-left text-xs text-nd-text-primary/80 hover:border-nd-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40"
                    >
                      <span className="block truncate font-medium">{prompt.title}</span>
                      <span className="block truncate text-nd-text-muted">{prompt.prompt}</span>
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-nd-text-muted/70">No saved prompts.</div>
                )}
              </div>
            </Panel>

            <Panel eyebrow="Macros" title="Recorded Macros" className="min-h-0">
              <div
                id="pd-macro-list"
                className="promptdrive-macro-list grid max-h-28 gap-2 overflow-auto"
                tabIndex={0}
                aria-label="Recorded macros"
              >
                {macros.length ? (
                  macros.map((macro) => (
                    <div
                      key={macro.id}
                      className="promptdrive-macro-item flex min-h-touch items-center justify-between gap-2 rounded-lg border border-nd-border-subtle px-2.5 py-2 text-xs text-nd-text-primary/80"
                    >
                      <div className="min-w-0 overflow-hidden">
                        <span className="block truncate font-medium">{macro.name}</span>
                        <span className="block truncate text-nd-text-muted">
                          {macro.steps.length} steps · {macro.risk_level}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="primary"
                          size="xs"
                          aria-label={`Replay macro ${macro.name}`}
                          onClick={() => replayMacro(macro.id)}
                        >
                          Replay
                        </Button>
                        <IconButton
                          aria-label={`Delete macro ${macro.name}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMacro(macro.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-nd-accent-error" aria-hidden="true" />
                        </IconButton>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-nd-text-muted/70">No macros recorded.</div>
                )}
              </div>
            </Panel>
          </div>
        </Panel>

        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <Panel eyebrow="Suggestions" title="Ranked Suggestions">
            <TextInput
              id="pd-suggestion-query"
              label="Search"
              value={suggestionQuery}
              onChange={(event) => setSuggestionQuery(event.target.value)}
              placeholder="Search suggestions"
              fullWidth
            />
            <div
              id="pd-suggestions"
              className="mt-2 grid max-h-40 gap-2 overflow-auto"
              role="listbox"
              aria-label="Ranked suggestions"
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  role="option"
                  aria-label={`Use suggestion: ${suggestion.label}`}
                  tabIndex={0}
                  onClick={() => acceptSuggestion(suggestion)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void acceptSuggestion(suggestion);
                    }
                  }}
                  className="promptdrive-suggestion min-h-touch min-w-0 overflow-hidden rounded-xl border border-nd-border-subtle bg-nd-surface-secondary px-3 py-2 text-left hover:border-nd-accent-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40"
                >
                  <span className="block truncate text-sm font-medium text-nd-text-primary">
                    {suggestion.label}
                  </span>
                  <span className="block truncate text-xs text-nd-text-muted">
                    {suggestion.source} · score {suggestion.score}
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel
            className="flex min-h-0 flex-1 flex-col"
            eyebrow="Preview"
            title="Live Prompt Preview"
          >
            <textarea
              id="pd-preview"
              value={previewText}
              onChange={(event) => setPreviewText(event.target.value)}
              aria-label="Live prompt preview"
              className="min-h-touch min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm text-nd-text-primary/90 outline-none"
            />
            <div className="flex items-center justify-between border-t border-nd-border-subtle px-4 py-2 text-xs text-nd-text-muted">
              <span>{status}</span>
              <div className="flex items-center gap-3">
                <span>~{tokenCount(previewText)} tokens</span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => navigator.clipboard.writeText(previewText)}
                  icon={Copy}
                >
                  Copy
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
