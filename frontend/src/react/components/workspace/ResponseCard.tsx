import { useState } from 'react';
import { Bot, Check, Copy, RefreshCw, User } from 'lucide-react';
import { IconButton } from '../../components/primitives/IconButton';
import type { AIMessage } from '../../types/neurodeck';

interface ResponseCardProps {
  message: AIMessage;
  style?: React.CSSProperties;
  isStreaming?: boolean;
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

export function ResponseCard({ message, style, isStreaming, onRegenerate }: ResponseCardProps) {
  const isUser = message.role === 'user';
  const time = formatTime(message.createdAt);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable in this context
    }
  };

  return (
    <article
      className={`message group flex animate-view-enter gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      aria-label={`${isUser ? 'Your message' : 'AI response'}`}
      style={style}
    >
      {/* Avatar */}
      <div
        aria-hidden="true"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold shadow-sm ${
          isUser
            ? 'border-nd-accent-primary/30 bg-nd-accent-primary/15 text-nd-accent-primary'
            : 'border-nd-border-subtle bg-nd-surface-tertiary text-nd-text-muted'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={`relative flex max-w-[85%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative overflow-hidden rounded-2xl border px-4 py-3 shadow-sm transition ${
            isUser
              ? 'border-nd-accent-primary/25 bg-gradient-to-br from-nd-accent-primary/10 to-nd-accent-primary/5'
              : 'border-nd-border-subtle bg-nd-surface-secondary/40'
          }`}
          aria-busy={isStreaming ? 'true' : undefined}
        >
          {/* Top accent line for AI */}
          {!isUser && (
            <div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-nd-accent-primary/50 via-nd-accent-success/30 to-transparent"
              aria-hidden="true"
            />
          )}

          {/* Header */}
          <div className="mb-1.5 flex items-center justify-between gap-4">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                isUser ? 'text-nd-accent-primary' : 'text-nd-text-muted'
              }`}
            >
              {isUser ? 'You' : message.provider ?? 'AI'}
            </span>
            <time
              dateTime={message.createdAt ?? ''}
              className="text-[10px] tabular-nums text-nd-text-muted/70"
            >
              {time}
              {message.model ? ` · ${message.model}` : ''}
              {message.latencyMs ? ` · ${message.latencyMs}ms` : ''}
            </time>
          </div>

          {/* Content */}
          <p className="msg-content whitespace-pre-wrap text-sm leading-6 text-nd-text-primary/90">
            {message.content}
            {isStreaming && (
              <span
                className="ml-0.5 inline-block h-3.5 w-2 animate-pulse bg-nd-accent-primary align-middle"
                aria-hidden="true"
              />
            )}
          </p>
        </div>

        {/* Hover/focus actions */}
        <div
          className={`mt-1 flex gap-1 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100 ${
            isUser ? 'justify-end' : 'justify-start'
          }`}
        >
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={copied ? 'Copied!' : 'Copy message'}
            title={copied ? 'Copied!' : 'Copy message'}
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-nd-accent-success" /> : <Copy className="h-3.5 w-3.5" />}
          </IconButton>
          {!isUser && (
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="Regenerate response"
              title="Regenerate response"
              onClick={() => onRegenerate?.(message.id)}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </IconButton>
          )}
        </div>
      </div>
    </article>
  );
}
