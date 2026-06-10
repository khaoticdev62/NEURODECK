import { Bot, Copy, RefreshCw, User } from 'lucide-react';
import type { AIMessage } from '../../types/neurodeck';

interface ResponseCardProps {
  message: AIMessage;
  style?: React.CSSProperties;
  onRegenerate?: (messageId: string) => void;
}

function formatTime(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function ResponseCard({ message, style, onRegenerate }: ResponseCardProps) {
  const isUser = message.role === 'user';
  const time = formatTime(message.createdAt);

  return (
    <article
      className={`message group ${message.role} flex animate-view-enter gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      aria-label={`${isUser ? 'Your message' : 'AI response'}`}
      style={style}
    >
      {/* Avatar */}
      <div
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[10px] font-bold shadow-sm ${
          isUser
            ? 'border-nd-accent/30 bg-nd-accent/15 text-nd-accent'
            : 'border-nd-text-muted/15 bg-nd-surface/60 text-nd-text-muted'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={`relative max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={`relative overflow-hidden rounded-2xl border px-4 py-3 shadow-sm transition ${
            isUser
              ? 'border-nd-accent/25 bg-gradient-to-br from-nd-accent/[0.12] to-nd-accent/[0.04]'
              : 'border-nd-text-muted/15 bg-nd-surface/50'
          }`}
        >
          {/* Top accent line for AI */}
          {!isUser && (
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-nd-accent/40 via-nd-success/30 to-transparent" aria-hidden="true" />
          )}

          {/* Header */}
          <div className="mb-1.5 flex items-center justify-between gap-4">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isUser ? 'text-nd-accent' : 'text-nd-text-muted'}`}>
              {isUser ? 'You' : message.provider ?? 'AI'}
            </span>
            <span className="text-[10px] tabular-nums text-nd-text-muted/60">
              {time}
              {message.latencyMs ? ` · ${message.latencyMs}ms` : ''}
            </span>
          </div>

          {/* Content */}
          <p className="whitespace-pre-wrap text-sm leading-6 text-nd-text/90">{message.content}</p>
        </div>

        {/* Hover actions */}
        <div className={`mt-1 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <ActionBtn icon={Copy} label="Copy" onClick={() => navigator.clipboard.writeText(message.content)} />
          {!isUser && <ActionBtn icon={RefreshCw} label="Regenerate" onClick={() => onRegenerate?.(message.id)} />}
        </div>
      </div>
    </article>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-nd-text-muted transition hover:bg-nd-surface/60 hover:text-nd-text/80"
      aria-label={label}
      title={label}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </button>
  );
}
