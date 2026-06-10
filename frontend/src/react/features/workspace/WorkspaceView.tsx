import type { Dispatch } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BrainCircuit, FileJson, FolderOpen, Gauge, HardDrive, Hash,
  Mic, Paperclip, ScanLine, SendHorizontal, Sparkles, Target,
  Wand2, Zap
} from 'lucide-react';
import { starterPrompts } from '../../types/seed';
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckSelectors, NeuroDeckState } from '../../types/neurodeck';
import { Badge } from '../../components/primitives/Badge';
import { MetricCard } from '../../components/primitives/MetricCard';

const CHAT_STARTERS = [
  { icon: Zap, label: 'Explain RAG', hint: 'How retrieval-augmented generation works' },
  { icon: Wand2, label: 'Rust Handler', hint: 'Async Axum endpoint with error handling' },
  { icon: Target, label: 'Game Mechanic', hint: 'Unique roguelike system design concept' },
  { icon: Hash, label: 'Code Review', hint: 'Find bugs and performance issues in pasted code' },
  { icon: Sparkles, label: 'Sprint Planning', hint: 'Break scope into tasks for a solo-dev AI app' },
  { icon: BrainCircuit, label: 'Debug Help', hint: 'Paste your error for AI-assisted diagnosis' },
];

export function WorkspaceView({ state, dispatch, selectors, actions }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction>; selectors: NeuroDeckSelectors; actions: NeuroDeckAppActions }) {
  const healthReady = state.aiHealth.filter((item) => item.available).length;
  const hasOnlyWelcome = state.messages.length === 1 && state.messages[0]?.id === 'system-welcome';
  const showWelcome = state.messages.length === 0 || hasOnlyWelcome;

  return (
    <div className="workspace-container flex h-full min-h-0 flex-col gap-3">
      {/* Session Header */}
      <div className="flex items-center justify-between rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="chat-session-kicker text-xs font-semibold uppercase tracking-wider text-nd-text0">Active Session</span>
          <span className="h-1.5 w-1.5 rounded-full bg-nd-success" />
          <span className="text-xs text-nd-text-muted">{state.activeProject?.name || 'Welcome session'}</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="accent">{state.selectedProvider}</Badge>
          <span className="text-xs text-nd-text0">{selectors.messageCount} msgs</span>
        </div>
      </div>

      {/* Metrics Row */}
      <section className="grid gap-2 md:grid-cols-4">
        <MetricCard icon={BrainCircuit} label="Models" value={selectors.readyModels} hint="available locally" />
        <MetricCard icon={Gauge} label="Latency" value={`${state.telemetry.latencyMs}ms`} hint="last AI response" />
        <MetricCard icon={Sparkles} label="Runs" value={selectors.completedRuns} hint="agent completions" />
        <MetricCard icon={HardDrive} label="Cache" value={`${state.telemetry.cacheHealth}%`} hint="offline readiness" />
      </section>

      {/* Chat Area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {showWelcome ? (
            <div className="flex flex-col items-center py-8 text-center">
              {/* Logo */}
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-nd-accent/20 bg-nd-accent/10">
                <Sparkles className="h-8 w-8 text-nd-accent" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-nd-text">NEURODECK</h1>
              <p className="mt-1 text-sm text-nd-text0">AI-native terminal OS. Ask anything.</p>

              {/* Starter Grid */}
              <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CHAT_STARTERS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => dispatch({ type: 'run-starter', prompt: s.hint })}
                    className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 text-left transition hover:border-nd-accent/30 hover:bg-nd-accent/[0.06]"
                  >
                    <s.icon className="h-4 w-4 text-nd-accent" />
                    <p className="mt-2 text-xs font-medium text-nd-text/90">{s.label}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-nd-text-muted/70">{s.hint}</p>
                  </button>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <ActionChip icon={FolderOpen} label="Scan Project" onClick={() => void actions.scanProject()} />
                <ActionChip icon={FileJson} label="Build Context" onClick={() => void actions.buildProjectContext()} />
                <ActionChip icon={BrainCircuit} label="AI Health" onClick={() => void actions.checkAiHealth()} />
                <ActionChip icon={HardDrive} label="Save Session" onClick={() => void actions.saveSession()} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {state.messages.map((message) => (
                <article
                  key={message.id}
                  className={`message ${message.role} flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    message.role === 'user' ? 'bg-nd-accent/20 text-nd-accent' : 'bg-nd-surface/40 text-nd-text-muted'
                  }`}>
                    {message.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl border px-4 py-3 ${
                    message.role === 'user'
                      ? 'border-nd-accent/25 bg-nd-accent/[0.08]'
                      : 'border-nd-text-muted/15 bg-nd-surface/50'
                  }`}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-nd-text0">
                        {message.role}
                      </span>
                      <span className="text-[10px] text-nd-text-muted/70">
                        {message.provider ?? 'local'} {message.latencyMs ? `• ${message.latencyMs}ms` : ''}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-nd-text/90">{message.content}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-nd-text-muted/15 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-nd-text0">
            <Badge tone="accent">{state.selectedProvider}</Badge>
            <Badge tone={state.projectContext ? 'success' : 'warning'}>{state.projectContext ? 'context attached' : 'no context'}</Badge>
            <Badge tone={healthReady > 1 ? 'success' : 'neutral'}>{healthReady} provider(s) ready</Badge>
            <span className="ml-auto">Ctrl/Cmd + Enter to send</span>
          </div>
          <div className="flex items-end gap-2 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/50 p-2 focus-within:border-nd-accent/40 focus-within:shadow-focus">
            <div className="flex gap-1 pb-2 pl-2">
              <button type="button" className="rounded-lg p-1.5 text-nd-text0 hover:bg-nd-surface/50 hover:text-nd-text/80" title="Attach file">
                <Paperclip className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-lg p-1.5 text-nd-text0 hover:bg-nd-surface/50 hover:text-nd-text/80" title="Voice input">
                <Mic className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-lg p-1.5 text-nd-text0 hover:bg-nd-surface/50 hover:text-nd-text/80" title="Screenshot">
                <ScanLine className="h-4 w-4" />
              </button>
            </div>
            <textarea
              id="user-input"
              value={state.composerValue}
              onChange={(event) => dispatch({ type: 'set-composer', value: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void actions.runAssistant(event.currentTarget.value);
                  return;
                }
                if (event.key === 'Enter' && event.shiftKey) return;
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  void actions.runAssistant(event.currentTarget.value);
                }
              }}
              placeholder="Enter command or type message..."
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm leading-5 text-nd-text outline-none placeholder:text-nd-text-muted/70"
              rows={1}
            />
            <button
              type="button"
              onClick={() => void actions.runAssistant()}
              className="mb-0.5 inline-flex h-9 items-center gap-1.5 rounded-xl bg-nd-accent px-3 text-sm font-semibold text-nd-bg transition hover:brightness-110"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionChip({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-nd-text-muted/15 bg-nd-surface/50 px-3 py-1.5 text-xs text-nd-text-muted transition hover:border-nd-accent/30 hover:text-nd-text/90"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
