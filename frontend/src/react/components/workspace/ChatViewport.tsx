import type { LucideIcon } from 'lucide-react';
import {
  BrainCircuit, FileJson, FolderOpen, HardDrive, Hash, Sparkles, Target, Wand2, Zap,
} from 'lucide-react';
import { ResponseCard } from './ResponseCard';
import type { AIMessage } from '../../types/neurodeck';

interface ChatViewportProps {
  messages: AIMessage[];
  onRunStarter: (prompt: string) => void;
  onScanProject: () => void;
  onBuildContext: () => void;
  onCheckHealth: () => void;
  onSaveSession: () => void;
}

const STARTERS = [
  { icon: Zap,         label: 'Explain RAG',    hint: 'How retrieval-augmented generation works' },
  { icon: Wand2,       label: 'Rust Handler',   hint: 'Async Axum endpoint with error handling' },
  { icon: Target,      label: 'Game Mechanic',  hint: 'Unique roguelike system design concept' },
  { icon: Hash,        label: 'Code Review',    hint: 'Find bugs and performance issues in pasted code' },
  { icon: Sparkles,    label: 'Sprint Plan',    hint: 'Break scope into tasks for a solo-dev AI app' },
  { icon: BrainCircuit,label: 'Debug Help',     hint: 'Paste your error for AI-assisted diagnosis' },
];

export function ChatViewport({
  messages,
  onRunStarter,
  onScanProject,
  onBuildContext,
  onCheckHealth,
  onSaveSession,
}: ChatViewportProps) {
  const hasOnlyWelcome = messages.length === 1 && messages[0]?.id === 'system-welcome';
  const showWelcome = messages.length === 0 || hasOnlyWelcome;

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin" role="log" aria-label="Conversation">
      {showWelcome ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-nd-accent/20 bg-nd-accent/10">
            <Sparkles className="h-8 w-8 text-nd-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-nd-text">NEURODECK</h1>
          <p className="mt-1 text-sm text-nd-text-muted">AI-native terminal OS. Ask anything.</p>

          <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STARTERS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onRunStarter(s.hint)}
                className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 text-left transition hover:border-nd-accent/30 hover:bg-nd-accent/[0.06]"
              >
                <s.icon className="h-4 w-4 text-nd-accent" />
                <p className="mt-2 text-xs font-medium text-nd-text/90">{s.label}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-nd-text-muted/70">{s.hint}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <QuickChip icon={FolderOpen}   label="Scan Project"   onClick={onScanProject} />
            <QuickChip icon={FileJson}     label="Build Context"  onClick={onBuildContext} />
            <QuickChip icon={BrainCircuit} label="AI Health"      onClick={onCheckHealth} />
            <QuickChip icon={HardDrive}    label="Save Session"   onClick={onSaveSession} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <ResponseCard key={msg.id} message={msg} />
          ))}
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
      className="flex items-center gap-1.5 rounded-full border border-nd-text-muted/15 bg-nd-surface/50 px-3 py-1.5 text-xs text-nd-text-muted transition hover:border-nd-accent/30 hover:text-nd-text/90"
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
