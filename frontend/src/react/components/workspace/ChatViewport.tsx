import { useRef, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BrainCircuit, FileJson, FolderOpen, HardDrive, Hash, Sparkles, Target, Wand2, Zap,
} from 'lucide-react';
import { ResponseCard } from './ResponseCard';
import type { AIMessage } from '../../types/neurodeck';

interface ChatViewportProps {
  messages: AIMessage[];
  onRunStarter: (prompt: string) => void;
  onRegenerate?: (messageId: string) => void;
  onScanProject: () => void;
  onBuildContext: () => void;
  onCheckHealth: () => void;
  onSaveSession: () => void;
}

const STARTERS = [
  { icon: Zap,         label: 'Explain RAG',    hint: 'How retrieval-augmented generation works', color: 'from-nd-accent/20 to-transparent' },
  { icon: Wand2,       label: 'Rust Handler',   hint: 'Async Axum endpoint with error handling', color: 'from-nd-success/15 to-transparent' },
  { icon: Target,      label: 'Game Mechanic',  hint: 'Unique roguelike system design concept', color: 'from-nd-warning/15 to-transparent' },
  { icon: Hash,        label: 'Code Review',    hint: 'Find bugs and performance issues in pasted code', color: 'from-nd-danger/15 to-transparent' },
  { icon: Sparkles,    label: 'Sprint Plan',    hint: 'Break scope into tasks for a solo-dev AI app', color: 'from-nd-accent/15 to-transparent' },
  { icon: BrainCircuit,label: 'Debug Help',     hint: 'Paste your error for AI-assisted diagnosis', color: 'from-nd-success/15 to-transparent' },
];

export function ChatViewport({
  messages,
  onRunStarter,
  onRegenerate,
  onScanProject,
  onBuildContext,
  onCheckHealth,
  onSaveSession,
}: ChatViewportProps) {
  const hasOnlyWelcome = messages.length === 1 && messages[0]?.id === 'system-welcome';
  const showWelcome = messages.length === 0 || hasOnlyWelcome;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showWelcome && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showWelcome]);

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin" role="log" aria-label="Conversation">
      {showWelcome ? (
        <div className="flex flex-col items-center py-6 text-center">
          {/* Hero logo with glow */}
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-3xl bg-nd-accent/20 blur-2xl" aria-hidden="true" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-nd-accent/30 bg-gradient-to-br from-nd-accent/20 to-nd-accent/5 shadow-glow-md">
              <Sparkles className="h-10 w-10 text-nd-accent" />
            </div>
          </div>

          <h1 className="bg-gradient-to-r from-nd-text via-nd-text to-nd-accent bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            NEURODECK
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-nd-text-muted">
            Local-first AI workstation OS. Attach project context, pick a runtime, and start building.
          </p>

          {/* Starter grid with staggered entrance */}
          <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STARTERS.map((s, index) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onRunStarter(s.hint)}
                className="group relative overflow-hidden rounded-2xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-nd-accent/30 hover:bg-nd-accent/[0.04] hover:shadow-panel"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.color}`} aria-hidden="true" />
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-nd-text-muted/15 bg-nd-surface/60 transition group-hover:border-nd-accent/30 group-hover:bg-nd-accent/10">
                    <s.icon className="h-4 w-4 text-nd-accent transition group-hover:scale-110" />
                  </div>
                  <p className="text-xs font-semibold text-nd-text/90">{s.label}</p>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-nd-text-muted/70">{s.hint}</p>
              </button>
            ))}
          </div>

          {/* Quick action chips */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <QuickChip icon={FolderOpen} label="Scan Project" onClick={onScanProject} />
            <QuickChip icon={FileJson} label="Build Context" onClick={onBuildContext} />
            <QuickChip icon={BrainCircuit} label="AI Health" onClick={onCheckHealth} />
            <QuickChip icon={HardDrive} label="Save Session" onClick={onSaveSession} />
          </div>

          {/* Typing hint */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-1.5 text-[11px] text-nd-text-muted">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-nd-accent" />
            Start typing below or pick a starter
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <ResponseCard
              key={msg.id}
              message={msg}
              onRegenerate={onRegenerate}
              style={{ animationDelay: `${index * 40}ms` }}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

function QuickChip({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-nd-text-muted/15 bg-nd-surface/50 px-3 py-1.5 text-xs text-nd-text-muted transition hover:-translate-y-px hover:border-nd-accent/30 hover:bg-nd-accent/[0.05] hover:text-nd-text/90"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
