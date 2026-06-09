import type { Dispatch } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BrainCircuit, Database, FileJson, FolderOpen, Gauge, HardDrive, SendHorizontal, Sparkles, Workflow } from 'lucide-react';
import { starterPrompts } from '../../types/seed';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckSelectors, NeuroDeckState } from '../../types/neurodeck';
import { Badge } from '../../components/primitives/Badge';
import { MetricCard } from '../../components/primitives/MetricCard';
import { Panel } from '../../components/primitives/Panel';

export function WorkspaceView({ state, dispatch, selectors, actions }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction>; selectors: NeuroDeckSelectors; actions: NeuroDeckAppActions }) {
  const healthReady = state.aiHealth.filter((item) => item.available).length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={BrainCircuit} label="Models" value={selectors.readyModels} hint="available locally" />
        <MetricCard icon={Gauge} label="Latency" value={`${state.telemetry.latencyMs}ms`} hint="last AI response" />
        <MetricCard icon={Workflow} label="Runs" value={selectors.completedRuns} hint="agent completions" />
        <MetricCard icon={HardDrive} label="Cache" value={`${state.telemetry.cacheHealth}%`} hint="offline readiness" />
      </section>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_380px]">
        <Panel eyebrow="Workspace" title="Local AI Execution Console" className="min-h-0 overflow-hidden">
          <div className="flex h-full min-h-[440px] flex-col">
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              <div className="rounded-3xl border border-neuro/20 bg-neuro/[0.045] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Badge tone="accent">v5 Execution Layer</Badge>
                    <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-50">Run local AI. Attach project context. Keep the renderer boxed in.</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      NEURODECK v5 adds local AI adapters, project-context snapshots, agent run orchestration, health checks, and session saves through secure Electron IPC.
                    </p>
                  </div>
                  <Sparkles className="hidden h-10 w-10 text-neuro md:block" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <ActionCard icon={FolderOpen} title="Scan Project" body="Detect stack, scripts, docs, tests, risks." onClick={() => void actions.scanProject()} primary />
                <ActionCard icon={FileJson} title="Build Context" body="Read allowlisted files and redact secrets." onClick={() => void actions.buildProjectContext()} />
                <ActionCard icon={BrainCircuit} title="AI Health" body="Check Ollama, LM Studio, and fallback." onClick={() => void actions.checkAiHealth()} />
                <ActionCard icon={HardDrive} title="Save Session" body="Persist chat and run history as JSON." onClick={() => void actions.saveSession()} />
              </div>

              <div className="mt-4 space-y-3">
                {state.messages.map((message) => (
                  <article key={message.id} className={`rounded-2xl border p-4 ${message.role === 'user' ? 'border-neuro/25 bg-neuro/[0.055]' : 'border-white/10 bg-white/[0.035]'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={message.role === 'user' ? 'accent' : 'neutral'}>{message.role}</Badge>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-600">{message.provider ?? 'local'} {message.latencyMs ? `• ${message.latencyMs}ms` : ''}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{message.content}</p>
                  </article>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {starterPrompts.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => dispatch({ type: 'run-starter', prompt })} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left text-sm text-slate-300 transition hover:border-neuro/30 hover:bg-neuro/[0.06]">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge tone="accent">{state.selectedProvider}</Badge>
                <Badge tone={state.projectContext ? 'success' : 'warning'}>{state.projectContext ? 'context attached' : 'no context'}</Badge>
                <Badge tone={healthReady > 1 ? 'success' : 'neutral'}>{healthReady} provider(s) ready</Badge>
                <span>Ctrl/Cmd + Enter runs the prompt.</span>
              </div>
              <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 focus-within:border-neuro/40 focus-within:shadow-focus">
                <textarea
                  value={state.composerValue}
                  onChange={(event) => dispatch({ type: 'set-composer', value: event.target.value })}
                  placeholder="Ask NEURODECK to build, audit, refactor, document, or plan..."
                  className="max-h-32 min-h-12 flex-1 resize-none bg-transparent text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600"
                />
                <button type="button" onClick={() => void actions.runAssistant()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-neuro px-4 text-sm font-semibold text-blacksite transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-neuro/40">
                  Run <SendHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Execution Context" title="Current Stack">
          <div className="space-y-3 p-4">
            <ContextRow label="Project" value={state.activeProject?.name ?? 'No project attached'} tone={state.activeProject ? 'success' : 'warning'} />
            <ContextRow label="Context" value={state.projectContext?.summary ?? 'Context not built'} tone={state.projectContext ? 'success' : 'neutral'} />
            <ContextRow label="Provider" value={`${state.selectedProvider} / ${state.selectedModelId}`} tone="success" />
            <ContextRow label="Models" value={state.modelDetection?.summary ?? 'Detection not run'} tone={state.modelDetection ? 'success' : 'neutral'} />
            <ContextRow label="Export" value={state.lastExportPath ? 'Export/save ready' : 'No export yet'} tone={state.lastExportPath ? 'success' : 'neutral'} />
            <ContextRow label="Messages" value={`${selectors.messageCount} message(s)`} tone="neutral" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, body, onClick, primary = false }: { icon: LucideIcon; title: string; body: string; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${primary ? 'border-neuro/25 bg-neuro/[0.07] hover:bg-neuro/[0.11]' : 'border-white/10 bg-white/[0.035] hover:border-neuro/30 hover:bg-neuro/[0.06]'}`}>
      <Icon className="h-5 w-5 text-neuro" />
      <h3 className="mt-3 font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
    </button>
  );
}

function ContextRow({ label, value, tone }: { label: string; value: string; tone: 'success' | 'warning' | 'neutral' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-600">{label}</span>
        <Badge tone={tone}>{tone}</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-300">{value}</p>
    </div>
  );
}
