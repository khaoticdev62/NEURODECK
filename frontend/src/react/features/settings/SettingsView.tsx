import type { Dispatch } from 'react';
import { BrainCircuit, FileArchive, FileDown, Gamepad2, Palette, RefreshCcw, RotateCcw } from 'lucide-react';
import { themes } from '../../types/seed';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import type { AIProvider, NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState, ThemeName } from '../../types/neurodeck';

const providers: Array<{ id: AIProvider; label: string; description: string }> = [
  { id: 'offline-draft', label: 'Offline Draft', description: 'Always-available deterministic planning fallback.' },
  { id: 'ollama', label: 'Ollama', description: 'Local Ollama chat endpoint at 127.0.0.1:11434.' },
  { id: 'lmstudio', label: 'LM Studio', description: 'OpenAI-compatible local endpoint at 127.0.0.1:1234.' }
];

export function SettingsView({ state, dispatch, actions }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction>; actions: NeuroDeckAppActions }) {
  return (
    <div className="grid h-full gap-4 overflow-y-auto scrollbar-thin xl:grid-cols-[1fr_380px]">
      <Panel eyebrow="Theme Engine" title="Visual Presets">
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {themes.map((theme) => (
            <button key={theme.name} type="button" onClick={() => dispatch({ type: 'set-theme', theme: theme.name as ThemeName })} className={`rounded-2xl border p-4 text-left transition ${state.selectedTheme === theme.name ? 'border-neuro/40 bg-neuro/10' : 'border-white/10 bg-white/[0.035] hover:border-neuro/25'}`}>
              <div className="flex items-center justify-between">
                <Palette className="h-5 w-5 text-neuro" />
                {state.selectedTheme === theme.name && <Badge tone="accent">Active</Badge>}
              </div>
              <h3 className="mt-4 font-semibold text-slate-100">{theme.name}</h3>
              <div className="mt-3 flex gap-1.5">
                {[theme.background, theme.surface, theme.surfaceRaised, theme.accent, theme.success, theme.warning, theme.danger].map((color) => <span key={color} className="h-5 flex-1 rounded-full border border-white/10" style={{ backgroundColor: color }} />)}
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel eyebrow="AI Runtime" title="Provider Selection">
          <div className="space-y-3 p-4">
            {providers.map((provider) => {
              const health = state.aiHealth.find((item) => item.provider === provider.id);
              return (
                <button key={provider.id} type="button" onClick={() => dispatch({ type: 'set-provider', provider: provider.id })} className={`w-full rounded-2xl border p-4 text-left transition ${state.selectedProvider === provider.id ? 'border-neuro/40 bg-neuro/10' : 'border-white/10 bg-white/[0.035] hover:border-neuro/25'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-neuro" /><span className="font-semibold text-slate-100">{provider.label}</span></div>
                    <Badge tone={health?.available ? 'success' : provider.id === 'offline-draft' ? 'success' : 'warning'}>{health?.available ? 'ready' : 'cold'}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{provider.description}</p>
                  {health && <p className="mt-2 text-xs text-slate-600">{health.detail}</p>}
                </button>
              );
            })}
            <button type="button" onClick={() => void actions.checkAiHealth()} className="w-full rounded-xl border border-neuro/25 bg-neuro/10 px-3 py-2 text-sm font-semibold text-neuro transition hover:bg-neuro/15">
              Check AI health
            </button>
          </div>
        </Panel>

        <Panel eyebrow="Input" title="Deck Mode">
          <div className="space-y-3 p-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <Gamepad2 className="h-6 w-6 text-neuro" />
              <h3 className="mt-3 font-semibold text-slate-100">Controller-first layout</h3>
              <p className="mt-2 text-sm text-slate-400">Increases hit targets, density spacing, and focus affordances for Steam Deck-style navigation.</p>
              <button type="button" onClick={() => dispatch({ type: 'toggle-deck-mode' })} className="mt-4 w-full rounded-xl border border-neuro/25 bg-neuro/10 px-3 py-2 text-sm font-semibold text-neuro transition hover:bg-neuro/15">
                {state.deckMode ? 'Disable' : 'Enable'} Deck Mode
              </button>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Native Actions" title="Local Utilities">
          <div className="space-y-2 p-4">
            <button type="button" onClick={() => void actions.refreshDiagnostics()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-neuro/25 hover:text-neuro">
              <RefreshCcw className="h-4 w-4" /> Refresh Diagnostics
            </button>
            <button type="button" onClick={() => void actions.exportSession()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-neuro/25 hover:text-neuro">
              <FileDown className="h-4 w-4" /> Export Session
            </button>
            <button type="button" onClick={() => void actions.saveSession()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-neuro/25 hover:text-neuro">
              <FileDown className="h-4 w-4" /> Save Session JSON
            </button>
            <button type="button" onClick={() => void actions.exportDiagnosticsBundle()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-neuro/25 hover:text-neuro">
              <FileArchive className="h-4 w-4" /> Export Diagnostics Bundle
            </button>
          </div>
        </Panel>

        <Panel eyebrow="Privacy" title="Local State">
          <div className="p-4">
            <p className="mb-3 text-xs leading-5 text-slate-500">Settings, project scan summary, redacted project context, AI messages, agent runs, and UI state persist locally under the Electron userData folder.</p>
            <button type="button" onClick={() => void actions.resetLocalState()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger/15">
              <RotateCcw className="h-4 w-4" /> Reset stored UI state
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
