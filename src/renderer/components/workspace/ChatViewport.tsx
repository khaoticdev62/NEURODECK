import { useRef, useEffect, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  FileJson,
  FolderOpen,
  HardDrive,
  Hash,
  Sparkles,
  Target,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { BrandLogo } from "../../components/primitives/BrandLogo";
import { ResponseCard } from "./ResponseCard";
import type { AIMessage } from "../../types/neurodeck";

interface ChatViewportProps {
  messages: AIMessage[];
  busyLabel?: string | null;
  onRunStarter: (prompt: string) => void;
  onRegenerate?: (messageId: string) => void;
  onScanProject: () => void;
  onBuildContext: () => void;
  onCheckHealth: () => void;
  onSaveSession: () => void;
}

const STARTERS = [
  {
    icon: Zap,
    label: "Explain RAG",
    hint: "How retrieval-augmented generation works",
    tone: "accent" as const,
  },
  {
    icon: Wand2,
    label: "Rust Handler",
    hint: "Async Axum endpoint with error handling",
    tone: "success" as const,
  },
  {
    icon: Target,
    label: "Game Mechanic",
    hint: "Unique roguelike system design concept",
    tone: "warning" as const,
  },
  {
    icon: Hash,
    label: "Code Review",
    hint: "Find bugs and performance issues in pasted code",
    tone: "danger" as const,
  },
  {
    icon: Sparkles,
    label: "Sprint Plan",
    hint: "Break scope into tasks for a solo-dev AI app",
    tone: "accent" as const,
  },
  {
    icon: BrainCircuit,
    label: "Debug Help",
    hint: "Paste your error for AI-assisted diagnosis",
    tone: "success" as const,
  },
];

const TONE_BAR: Record<(typeof STARTERS)[number]["tone"], string> = {
  accent: "bg-nd-accent-primary",
  success: "bg-nd-accent-success",
  warning: "bg-nd-accent-warning",
  danger: "bg-nd-accent-error",
};

export function ChatViewport({
  messages,
  busyLabel,
  onRunStarter,
  onRegenerate,
  onScanProject,
  onBuildContext,
  onCheckHealth,
  onSaveSession,
}: ChatViewportProps) {
  const hasOnlyWelcome = messages.length === 1 && messages[0]?.id === "system-welcome";
  const showWelcome = messages.length === 0 || hasOnlyWelcome;
  const bottomRef = useRef<HTMLDivElement>(null);

  const streamingMessageId = useMemo(() => {
    if (!busyLabel) return undefined;
    const last = messages[messages.length - 1];
    return last?.role === "assistant" ? last.id : undefined;
  }, [busyLabel, messages]);

  useEffect(() => {
    if (!showWelcome && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showWelcome]);

  return (
    <div
      id="chat-viewport"
      className="flex-1 overflow-y-auto p-4 scrollbar-thin"
      role="log"
      aria-label="Conversation"
      tabIndex={0}
    >
      {showWelcome ? (
        <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center px-5 py-3">
          <div className="flex items-center gap-4 border-b border-nd-border-subtle pb-3 text-left">
            <BrandLogo
              className="h-11 w-11 shrink-0"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="nd-view-eyebrow mb-1">Local intelligence layer / ready</p>
              <h1 className="font-display text-[24px] font-bold tracking-[0.12em] text-nd-text-primary">NEURODECK</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-nd-text-secondary">
                Build, inspect, and operate from one controller-first workspace. Choose a mission brief or enter a command below.
              </p>
            </div>
          </div>

          {/* Starter grid with staggered entrance */}
          <div className="mt-3 grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STARTERS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onRunStarter(s.hint)}
                className="group relative min-h-[88px] overflow-hidden rounded-[var(--nd-radius-lg)] border border-nd-border-subtle bg-[var(--nd-surface-glass)] p-3 text-left transition-[border-color,background-color] duration-fast hover:border-nd-accent-primary/40 hover:bg-[var(--nd-surface-tertiary)] focus-visible:outline-none"
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 ${TONE_BAR[s.tone]}`}
                  aria-hidden="true"
                />
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[var(--nd-radius-md)] border border-nd-border-subtle bg-nd-surface-tertiary transition group-hover:border-nd-accent-primary/30 group-hover:bg-nd-accent-primary/10">
                    <s.icon
                      className="h-4 w-4 text-nd-accent-primary transition group-hover:scale-110"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-xs font-semibold text-nd-text-primary/90">{s.label}</p>
                </div>
                <p className="mt-1.5 text-[13px] leading-5 text-nd-text-muted">{s.hint}</p>
              </button>
            ))}
          </div>

          {/* Quick action chips */}
          <div className="mt-2 flex flex-wrap gap-2" aria-label="Workspace actions">
            <QuickChip icon={FolderOpen} label="Scan Project" onClick={onScanProject} />
            <QuickChip icon={FileJson} label="Build Context" onClick={onBuildContext} />
            <QuickChip icon={BrainCircuit} label="AI Health" onClick={onCheckHealth} />
            <QuickChip icon={HardDrive} label="Save Session" onClick={onSaveSession} />
          </div>

          {/* Typing hint */}
          <div className="mt-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-nd-border-subtle bg-nd-surface-secondary/40 px-4 py-2 text-[13px] text-nd-text-secondary">
            <span className="inline-block h-2 w-2 rounded-full bg-nd-accent-success" aria-hidden="true" />
            Ready for keyboard, touch, or controller input
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <ResponseCard
              key={msg.id}
              message={msg}
              onRegenerate={onRegenerate}
              isStreaming={msg.id === streamingMessageId}
              style={{ animationDelay: `${index * 40}ms` }}
            />
          ))}
          {busyLabel && !streamingMessageId && (
            <div
              role="status"
              aria-live="polite"
              aria-label={busyLabel}
              className="flex items-center gap-2 px-1 py-1.5 text-xs text-nd-text-muted animate-fade-in"
            >
              <span
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-nd-accent-primary"
                aria-hidden="true"
              />
              {busyLabel}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

function QuickChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="soft" size="xs" icon={Icon} iconPosition="left" onClick={onClick}>
      {label}
    </Button>
  );
}
