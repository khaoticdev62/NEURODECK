import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Play, RotateCcw, Save, Sparkles, Square, Trash2 } from 'lucide-react';
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
} from '../../services/bridgeAdapter';

type SlotValues = Record<string, string>;

function tokenCount(text: string) {
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.35));
}

function defaultValues(template: PromptTemplate | null): SlotValues {
  const values: SlotValues = {};
  for (const slot of template?.slots ?? []) {
    values[slot.id] = slot.default ?? '';
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
  const [selectedPackId, setSelectedPackId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [slotValues, setSlotValues] = useState<SlotValues>({});
  const [preview, setPreview] = useState<PromptPreview | null>(null);
  const [previewText, setPreviewText] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [macros, setMacros] = useState<MacroDefinition[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordedSteps, setRecordedSteps] = useState<MacroStep[]>([]);
  const [status, setStatus] = useState('Loading PromptDrive...');
  const [busy, setBusy] = useState(false);

  const valid = preview?.valid ?? false;
  const selectedSlotId = selectedTemplate?.slots[0]?.id;

  const recordStep = useCallback((step: MacroStep) => {
    setRecordedSteps((current) => (recordingId ? [...current, step] : current));
  }, [recordingId]);

  const refreshSaved = useCallback(async () => {
    setSavedPrompts(await neurodeckApi.promptDrive.listSavedPrompts());
  }, []);

  const refreshMacros = useCallback(async () => {
    setMacros(await neurodeckApi.promptDrive.listMacros());
  }, []);

  const renderPreview = useCallback(async (template: PromptTemplate | null, values: SlotValues) => {
    if (!template) return;
    const result = await neurodeckApi.promptDrive.previewPrompt(template.id, values);
    setPreview(result);
    setPreviewText(result.rendered_prompt ?? '');
    setStatus(result.valid ? 'Valid prompt ready.' : `Missing: ${result.missing_slots.join(', ')}`);
  }, []);

  const selectTemplate = useCallback(async (templateId: string, record = true) => {
    const template = await neurodeckApi.promptDrive.getTemplate(templateId);
    const values = defaultValues(template);
    setSelectedTemplate(template);
    setSelectedPackId(template.pack_id);
    setSlotValues(values);
    if (record) {
      recordStep(macroStep('select_template', { template_id: template.id }));
    }
    await renderPreview(template, values);
  }, [recordStep, renderPreview]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const loadedPacks = await neurodeckApi.promptDrive.listPacks();
        const firstPack = loadedPacks[0];
        const loadedTemplates = await neurodeckApi.promptDrive.listTemplates(firstPack?.id);
        if (cancelled) return;
        setPacks(loadedPacks);
        setTemplates(loadedTemplates);
        setSelectedPackId(firstPack?.id ?? loadedTemplates[0]?.pack_id ?? '');
        await refreshSaved();
        await refreshMacros();
        if (loadedTemplates[0]) {
          await selectTemplate(loadedTemplates[0].id, false);
        } else {
          setStatus('No PromptDrive templates found.');
        }
      } catch (error) {
        if (!cancelled) setStatus(`PromptDrive unavailable: ${String(error)}`);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshMacros, refreshSaved, selectTemplate]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const timeout = window.setTimeout(() => {
      renderPreview(selectedTemplate, slotValues).catch(() => setStatus('Preview failed.'));
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
      const ranked = await neurodeckApi.promptDrive.getSuggestions(suggestionQuery, selectedTemplate?.id, selectedSlotId);
      if (!cancelled) setSuggestions(ranked);
    }
    loadSuggestions().catch(() => setSuggestions([]));
    return () => { cancelled = true; };
  }, [selectedSlotId, selectedTemplate?.id, suggestionQuery]);

  const filteredTemplates = useMemo(
    () => templates.filter((template) => !selectedPackId || template.pack_id === selectedPackId),
    [selectedPackId, templates],
  );

  const updateSlot = async (slotId: string, value: string, record = true) => {
    const next = { ...slotValues, [slotId]: value };
    setSlotValues(next);
    if (record) {
      recordStep(macroStep('update_slot', { slot_id: slotId, value }));
    }
    if (selectedTemplate) await renderPreview(selectedTemplate, next);
  };

  const acceptSuggestion = async (suggestion: Suggestion) => {
    const slotId = selectedSlotId ?? 'topic';
    await updateSlot(slotId, suggestion.insert_text);
    recordStep(macroStep('accept_suggestion', { slot_id: slotId, insert_text: suggestion.insert_text }));
  };

  const executePrompt = async () => {
    if (!selectedTemplate || !valid || !previewText.trim()) {
      setStatus('Fill required slots before execution.');
      return;
    }
    setBusy(true);
    await neurodeckApi.promptDrive.executePrompt(selectedTemplate.id, slotValues, previewText);
    recordStep(macroStep('execute_prompt', {
      template_id: selectedTemplate.id,
      slot_values: slotValues,
      prompt: previewText,
    }));
    setBusy(false);
    setStatus('Prompt execution routed through bridge.');
  };

  const savePrompt = async () => {
    if (!selectedTemplate || !valid || !previewText.trim()) {
      setStatus('Preview a valid prompt before saving.');
      return;
    }
    await neurodeckApi.promptDrive.savePrompt({
      title: selectedTemplate.title,
      template_id: selectedTemplate.id,
      pack_id: selectedTemplate.pack_id,
      slot_values: slotValues,
      prompt: previewText,
    });
    await refreshSaved();
    setStatus('Prompt saved.');
  };

  const toggleMacro = async () => {
    if (!recordingId) {
      const result = await neurodeckApi.promptDrive.macroStart();
      setRecordingId(result.recording_id);
      setRecordedSteps([]);
      setStatus('Macro recording started.');
      return;
    }
    const macro = await neurodeckApi.promptDrive.macroStop(
      recordingId,
      `PromptDrive Macro ${new Date().toLocaleTimeString()}`,
      recordedSteps,
    );
    setRecordingId(null);
    setRecordedSteps([]);
    await refreshMacros();
    setStatus(`Saved macro: ${macro.name}`);
  };

  const replayMacro = async (macroId: string) => {
    const result = await neurodeckApi.promptDrive.macroExecute(macroId);
    for (const step of result.macro.steps) {
      const payload = step.payload;
      if (step.kind === 'select_template' && typeof payload.template_id === 'string') {
        await selectTemplate(payload.template_id, false);
      }
      if (step.kind === 'update_slot' && typeof payload.slot_id === 'string') {
        await updateSlot(payload.slot_id, String(payload.value ?? ''), false);
      }
      if (step.kind === 'accept_suggestion' && typeof payload.slot_id === 'string') {
        await updateSlot(payload.slot_id, String(payload.insert_text ?? ''), false);
      }
      if (step.kind === 'insert_saved_prompt') {
        setPreviewText(String(payload.prompt ?? ''));
      }
      if (step.kind === 'execute_prompt') {
        await executePrompt();
      }
    }
    setStatus('Macro replay complete.');
  };

  const deleteMacro = async (macroId: string) => {
    await neurodeckApi.promptDrive.deleteMacro(macroId);
    await refreshMacros();
    setStatus('Macro deleted.');
  };

  useEffect(() => {
    return listenBridge('deckcode-action', (payload) => {
      if (typeof payload !== 'string') return;
      const actionId = payload.toLowerCase();

      if (actionId.includes('r4')) {
        if (suggestions[0]) {
          void acceptSuggestion(suggestions[0]);
        }
        return;
      }

      if (actionId.includes('r5') && actionId.includes('hold')) {
        void executePrompt();
        return;
      }

      if (actionId.includes('l5') && actionId.includes('r5')) {
        void toggleMacro();
        return;
      }

      if (actionId.includes('l5')) {
        void savePrompt();
        return;
      }

      if (actionId === 'b' || actionId.includes('cancel')) {
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
    });
  }, [acceptSuggestion, executePrompt, savePrompt, suggestions, toggleMacro]);

  return (
    <div data-testid="view-prompt-lab" className="active flex h-full flex-col overflow-hidden">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neuro/20 bg-neuro/10">
          <Sparkles className="h-5 w-5 text-neuro" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-slate-50">PromptDrive Composer</h2>
          <p className="text-xs text-slate-500">Pack templates, validated slots, autocomplete, saved prompts, and safe macro replay.</p>
        </div>
        <div className="hidden gap-1 text-[11px] text-slate-500 md:flex">
          <span className="rounded-lg border border-white/10 px-2 py-1">R4 suggestion</span>
          <span className="rounded-lg border border-white/10 px-2 py-1">R5 hold execute</span>
          <span className="rounded-lg border border-white/10 px-2 py-1">L5 save</span>
        </div>
      </div>

      <div className="promptdrive-composer grid min-h-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] gap-3 overflow-hidden">
        <section className="flex min-h-0 flex-col gap-3 overflow-auto rounded-2xl border border-white/10 bg-white/[0.02] p-3 scrollbar-thin">
          <div className="grid grid-cols-2 items-start gap-3">
            <div className="min-w-0">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Prompt Packs</div>
              <div id="pd-pack-list" className="grid gap-2">
                {packs.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setSelectedPackId(pack.id)}
                    className={`min-w-0 overflow-hidden rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${selectedPackId === pack.id ? 'border-neuro/40 bg-neuro/10 text-neuro' : 'border-white/10 bg-black/20 text-slate-300 hover:border-white/20'}`}
                  >
                    <span className="block truncate font-medium">{pack.title}</span>
                    <span className="block truncate text-xs leading-relaxed text-slate-500">{pack.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Templates</div>
              <div id="pd-template-list" className="grid gap-2">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template.id)}
                    className={`promptdrive-template-card min-w-0 overflow-hidden rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${selectedTemplate?.id === template.id ? 'border-neuro/40 bg-neuro/10 text-neuro' : 'border-white/10 bg-black/20 text-slate-300 hover:border-white/20'}`}
                  >
                    <span className="block truncate font-medium">{template.title}</span>
                    <span className="block truncate text-xs leading-relaxed text-slate-500">{template.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div id="pd-template-title" className="truncate text-sm font-semibold text-slate-100">{selectedTemplate?.title ?? 'Select a template'}</div>
                <div id="pd-template-desc" className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{selectedTemplate?.description ?? 'Choose a pack and template to start composing.'}</div>
              </div>
              <span id="pd-risk-badge" className="shrink-0 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-success">{selectedTemplate?.risk_level ?? 'low'}</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Required Slots</span>
              <span id="pd-validation-status" className={`truncate text-xs ${valid ? 'text-success' : 'text-warning'}`}>{valid ? 'Valid' : status}</span>
            </div>
            <div id="pd-slot-editor" className="grid gap-2">
              {(selectedTemplate?.slots ?? []).map((slot) => (
                <label key={slot.id} className="block rounded-xl border border-white/10 bg-black/20 p-3">
                  <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-400">
                    {slot.label}
                    {slot.required && <span className="text-warning">Required</span>}
                  </span>
                  {slot.kind === 'textarea' ? (
                    <textarea
                      id={`pd-slot-${slot.id}`}
                      value={slotValues[slot.id] ?? ''}
                      onChange={(event) => updateSlot(slot.id, event.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40"
                    />
                  ) : (
                    <input
                      id={`pd-slot-${slot.id}`}
                      type="text"
                      value={slotValues[slot.id] ?? ''}
                      onChange={(event) => updateSlot(slot.id, event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40"
                    />
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button id="pd-execute-btn" type="button" onClick={executePrompt} disabled={busy || !valid} className="flex min-h-10 items-center gap-2 rounded-xl border border-neuro/30 bg-neuro/10 px-3 py-2 text-sm font-medium text-neuro hover:bg-neuro/20 disabled:opacity-50">
              <Play className="h-4 w-4" /> Execute
            </button>
            <button id="pd-save-btn" type="button" onClick={savePrompt} disabled={!valid} className="flex min-h-10 items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success hover:bg-success/20 disabled:opacity-50">
              <Save className="h-4 w-4" /> Save Prompt
            </button>
            <button id="pd-macro-toggle-btn" type="button" onClick={toggleMacro} className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${recordingId ? 'border-danger/35 bg-danger/10 text-danger' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'}`}>
              {recordingId ? <Square className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              {recordingId ? 'Stop Macro' : 'Record Macro'}
            </button>
          </div>

          <div className="grid min-h-[110px] grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Saved Prompts</div>
              <div id="pd-saved-list" className="grid max-h-28 gap-2 overflow-auto scrollbar-thin">
                {savedPrompts.length ? savedPrompts.map((prompt) => (
                  <button key={prompt.id} type="button" onClick={() => setPreviewText(prompt.prompt)} className="promptdrive-saved-item min-w-0 overflow-hidden rounded-lg border border-white/10 px-2.5 py-2 text-left text-xs text-slate-300 hover:border-white/20">
                    <span className="block truncate font-medium">{prompt.title}</span>
                    <span className="block truncate text-slate-500">{prompt.prompt}</span>
                  </button>
                )) : <div className="text-xs text-slate-600">No saved prompts.</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Macros</div>
              <div id="pd-macro-list" className="grid max-h-28 gap-2 overflow-auto scrollbar-thin">
                {macros.length ? macros.map((macro) => (
                  <div key={macro.id} className="promptdrive-macro-item flex items-center justify-between gap-2 rounded-lg border border-white/10 px-2.5 py-2 text-xs text-slate-300">
                    <div className="min-w-0 overflow-hidden">
                      <span className="block truncate font-medium">{macro.name}</span>
                      <span className="block truncate text-slate-500">{macro.steps.length} steps · {macro.risk_level}</span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => replayMacro(macro.id)} className="inline-flex h-8 items-center rounded-lg border border-neuro/25 px-2.5 text-xs text-neuro">Replay</button>
                      <button type="button" onClick={() => deleteMacro(macro.id)} className="inline-flex h-8 items-center rounded-lg border border-danger/25 px-2 text-danger"><Trash2 className="h-3.5 w-3.5" /><span className="sr-only">Delete</span></button>
                    </div>
                  </div>
                )) : <div className="text-xs text-slate-600">No macros recorded.</div>}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="pd-suggestion-query">Ranked Suggestions</label>
            <input
              id="pd-suggestion-query"
              type="text"
              value={suggestionQuery}
              onChange={(event) => setSuggestionQuery(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40"
              placeholder="Search suggestions"
            />
            <div id="pd-suggestions" className="mt-2 grid max-h-40 gap-2 overflow-auto scrollbar-thin">
              {suggestions.map((suggestion) => (
                <button key={suggestion.id} type="button" onClick={() => acceptSuggestion(suggestion)} className="promptdrive-suggestion min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left hover:border-neuro/30">
                  <span className="block truncate text-sm font-medium text-slate-100">{suggestion.label}</span>
                  <span className="block truncate text-xs text-slate-500">{suggestion.source} · score {suggestion.score}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Preview</span>
              <span className="text-xs text-slate-500">~{tokenCount(previewText)} tokens</span>
            </div>
            <textarea
              id="pd-preview"
              value={previewText}
              onChange={(event) => setPreviewText(event.target.value)}
              className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm text-slate-200 outline-none"
            />
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-slate-500">
              <span>{status}</span>
              <button type="button" onClick={() => navigator.clipboard.writeText(previewText)} className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-2 text-slate-400 hover:text-slate-100">
                <Copy className="h-4 w-4" /> Copy
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
