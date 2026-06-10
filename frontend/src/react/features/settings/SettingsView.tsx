import { useState } from 'react';
import type { Dispatch } from 'react';
import { BrainCircuit, FileArchive, FileDown, Gamepad2, Palette, RefreshCcw, Rocket, RotateCcw, Settings } from 'lucide-react';
import { themes } from '../../types/seed';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import { LiveWallpaperPanel } from './LiveWallpaperPanel';
import type { AIProvider, NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState, ThemeName } from '../../types/neurodeck';

const providers: Array<{ id: AIProvider; label: string; description: string }> = [
  { id: 'offline-draft', label: 'Offline Draft', description: 'Always-available deterministic planning fallback.' },
  { id: 'ollama', label: 'Ollama', description: 'Local Ollama chat endpoint at 127.0.0.1:11434.' },
  { id: 'lmstudio', label: 'LM Studio', description: 'OpenAI-compatible local endpoint at 127.0.0.1:1234.' }
];

export function SettingsView({
  state,
  dispatch,
  actions,
  onPanelChange,
}: {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
  onPanelChange?: (panel: string) => void;
}) {
  const [activePanel, setActivePanel] = useState(() => {
    const saved = localStorage.getItem('settingsActivePanel');
    return saved && saved.startsWith('sp-') ? saved.replace('sp-', '') : 'general';
  });
  const selectPanel = (name: string) => {
    localStorage.setItem('settingsActivePanel', `sp-${name}`);
    setActivePanel(name);
    onPanelChange?.(name);
  };

  return (
    <div className="settings-modal-body grid h-full min-h-0 gap-4 overflow-hidden xl:grid-cols-[260px_1fr]">
      <aside className="stv-sidebar flex min-h-0 flex-col rounded-3xl border border-nd-text-muted/15 bg-nd-surface/50 p-3">
        <div className="stv-sidebar-brand-chip flex items-center gap-2 rounded-2xl border border-nd-accent/20 bg-nd-accent/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-nd-accent">
          <Settings className="h-4 w-4" /> Settings
        </div>
        <div className="mt-3 space-y-1.5 overflow-y-auto scrollbar-thin">
          {[
            ['general', 'General'],
            ['ai', 'AI'],
            ['appearance', 'Appearance'],
            ['terminal', 'Terminal'],
            ['extensions', 'Extensions'],
            ['memory', 'Memory'],
            ['network', 'Network'],
            ['computer', 'Computer'],
            ['sync', 'Sync'],
            ['voice', 'Voice'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              data-panel={`sp-${key}`}
              className={`stv-nav-item flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${activePanel === key ? 'active border-nd-accent/35 bg-nd-accent/10 text-nd-accent' : 'border-nd-text-muted/15 bg-nd-surface/30 text-nd-text/80 hover:border-nd-text-muted/20 hover:bg-nd-surface/50'}`}
              onClick={() => selectPanel(key)}
            >
              <span>{label}</span>
              {activePanel === key && <Badge tone="accent">Active</Badge>}
            </button>
          ))}
        </div>
      </aside>

      <section className="min-h-0 overflow-y-auto rounded-3xl border border-nd-text-muted/15 bg-nd-surface/30 p-4 scrollbar-thin">
        <div id="sp-general" className={`settings-panel ${activePanel === 'general' ? 'active' : 'hidden'}`} data-settings-theme={activePanel}>
          <Panel eyebrow="First Launch" title="Onboarding Wizard">
            <div className="space-y-3 p-4">
              <div className={`rounded-2xl border p-4 transition ${state.showOnboarding ? 'border-nd-accent/40 bg-nd-accent/10' : 'border-nd-text-muted/15 bg-nd-surface/40'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Rocket className="h-5 w-5 text-nd-accent" />
                    <div>
                      <h3 className="font-semibold text-nd-text">Show Onboarding</h3>
                      <p className="text-xs text-nd-text-muted">Display the welcome wizard on next launch.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'toggle-onboarding' })}
                    className={`relative h-7 w-12 rounded-full transition ${state.showOnboarding ? 'bg-nd-accent' : 'bg-nd-text-muted/20'}`}
                    aria-label={state.showOnboarding ? 'Disable onboarding wizard' : 'Enable onboarding wizard'}
                  >
                    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-nd-bg shadow transition-transform ${state.showOnboarding ? 'translate-x-[22px]' : 'translate-x-0.5'}`} style={{ left: '2px' }} />
                  </button>
                </div>
              </div>
            </div>
          </Panel>

          <Panel eyebrow="Theme Engine" title="Visual Presets">
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {themes.map((theme) => (
                <button key={theme.name} type="button" onClick={() => dispatch({ type: 'set-theme', theme: theme.name as ThemeName })} className={`rounded-2xl border p-4 text-left transition ${state.selectedTheme === theme.name ? 'border-nd-accent/40 bg-nd-accent/10' : 'border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/25'}`}>
                  <div className="flex items-center justify-between">
                    <Palette className="h-5 w-5 text-nd-accent" />
                    {state.selectedTheme === theme.name && <Badge tone="accent">Active</Badge>}
                  </div>
                  <h3 className="mt-4 font-semibold text-nd-text">{theme.name}</h3>
                  <div className="mt-3 flex gap-1.5">
                    {[theme.background, theme.surface, theme.surfaceRaised, theme.accent, theme.success, theme.warning, theme.danger].map((color) => <span key={color} className="h-5 flex-1 rounded-full border border-nd-text-muted/15" style={{ backgroundColor: color }} />)}
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        <div id="sp-ai" className={`settings-panel ${activePanel === 'ai' ? 'active' : 'hidden'}`} data-settings-theme={activePanel}>
          <Panel eyebrow="AI Runtime" title="Provider Selection">
            <div className="space-y-3 p-4">
              {providers.map((provider) => {
                const health = state.aiHealth.find((item) => item.provider === provider.id);
                return (
                  <button key={provider.id} type="button" onClick={() => dispatch({ type: 'set-provider', provider: provider.id })} className={`w-full rounded-2xl border p-4 text-left transition ${state.selectedProvider === provider.id ? 'border-nd-accent/40 bg-nd-accent/10' : 'border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/25'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-nd-accent" /><span className="font-semibold text-nd-text">{provider.label}</span></div>
                      <Badge tone={health?.available ? 'success' : provider.id === 'offline-draft' ? 'success' : 'warning'}>{health?.available ? 'ready' : 'cold'}</Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-nd-text-muted">{provider.description}</p>
                    {health && <p className="mt-2 text-xs text-nd-text-muted/70">{health.detail}</p>}
                  </button>
                );
              })}
              <button type="button" onClick={() => void actions.checkAiHealth()} className="w-full rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15">
                Check AI health
              </button>
            </div>
          </Panel>
        </div>

        <div id="sp-appearance" className={`settings-panel ${activePanel === 'appearance' ? 'active' : 'hidden'}`} data-settings-theme={activePanel}>
          <Panel eyebrow="Appearance" title="Live Wallpaper">
            <div className="p-4">
              <LiveWallpaperPanel />
            </div>
          </Panel>
        </div>

        <div id="sp-terminal" className={`settings-panel ${activePanel === 'terminal' ? 'active' : 'hidden'}`} data-settings-theme={activePanel}>
          <Panel eyebrow="Input" title="Deck Mode">
            <div className="space-y-3 p-4">
              <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4">
                <Gamepad2 className="h-6 w-6 text-nd-accent" />
                <h3 className="mt-3 font-semibold text-nd-text">Controller-first layout</h3>
                <p className="mt-2 text-sm text-nd-text-muted">Increases hit targets, density spacing, and focus affordances for Steam Deck-style navigation.</p>
                <button type="button" onClick={() => dispatch({ type: 'toggle-deck-mode' })} className="mt-4 w-full rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15">
                  {state.deckMode ? 'Disable' : 'Enable'} Deck Mode
                </button>
              </div>
            </div>
          </Panel>
        </div>

        <div id="sp-extensions" className={`settings-panel ${activePanel === 'extensions' ? 'active' : 'hidden'}`} data-settings-theme={activePanel}>
          <Panel eyebrow="Native Actions" title="Local Utilities">
            <div className="space-y-2 p-4">
              <button type="button" onClick={() => void actions.refreshDiagnostics()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent">
                <RefreshCcw className="h-4 w-4" /> Refresh Diagnostics
              </button>
              <button type="button" onClick={() => void actions.exportSession()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent">
                <FileDown className="h-4 w-4" /> Export Session
              </button>
              <button type="button" onClick={() => void actions.saveSession()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent">
                <FileDown className="h-4 w-4" /> Save Session JSON
              </button>
              <button type="button" onClick={() => void actions.exportDiagnosticsBundle()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-semibold text-nd-text/80 transition hover:border-nd-accent/25 hover:text-nd-accent">
                <FileArchive className="h-4 w-4" /> Export Diagnostics Bundle
              </button>
            </div>
          </Panel>
        </div>

        <div id="sp-memory" className={`settings-panel ${activePanel === 'memory' ? 'active' : 'hidden'}`} data-settings-theme={activePanel}>
          <Panel eyebrow="Privacy" title="Local State">
            <div className="p-4">
              <p className="mb-3 text-xs leading-5 text-nd-text-muted">Settings, project scan summary, redacted project context, AI messages, agent runs, and UI state persist locally under the Electron userData folder.</p>
              <button type="button" onClick={() => void actions.resetLocalState()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-nd-danger/25 bg-nd-danger/10 px-3 py-2 text-sm font-semibold text-nd-danger transition hover:bg-nd-danger/15">
                <RotateCcw className="h-4 w-4" /> Reset stored UI state
              </button>
            </div>
          </Panel>
        </div>

        <div id="sp-network" className={`settings-panel ${activePanel === 'network' ? 'active' : 'hidden'}`} data-settings-theme={activePanel}>
          <Panel eyebrow="Network" title="Connectivity">
            <div className="p-4">
              <p className="text-sm text-nd-text-muted">Network-related settings are kept minimal in this build.</p>
            </div>
          </Panel>
        </div>

        <div id="sp-computer" className={`settings-panel ${activePanel === 'computer' ? 'active' : 'hidden'}`} data-settings-theme={activePanel}>
          <Panel eyebrow="Computer" title="System">
            <div className="p-4">
              <p className="text-sm text-nd-text-muted">System compatibility options live here.</p>
            </div>
          </Panel>
        </div>

        <div id="sp-sync" className={`settings-panel ${activePanel === 'sync' ? 'active' : 'hidden'}`} data-settings-theme={activePanel}>
          <Panel eyebrow="Sync" title="State Sync">
            <div className="p-4">
              <p className="text-sm text-nd-text-muted">Sync configuration is local-first in this slice.</p>
            </div>
          </Panel>
        </div>

        <div id="sp-voice" className={`settings-panel ${activePanel === 'voice' ? 'active' : 'hidden'}`} data-settings-theme={activePanel}>
          <Panel eyebrow="Voice" title="Audio">
            <div className="p-4">
              <p className="text-sm text-nd-text-muted">Voice settings remain hidden in this build.</p>
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}
