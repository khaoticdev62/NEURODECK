import type { AIMessage } from '../../types/neurodeck';

interface ResponseCardProps {
  message: AIMessage;
}

export function ResponseCard({ message }: ResponseCardProps) {
  const isUser = message.role === 'user';

  return (
    <article
      className={`message ${message.role} flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      aria-label={`${isUser ? 'Your message' : 'AI response'}`}
    >
      <div
        aria-hidden="true"
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          isUser
            ? 'bg-nd-accent/20 text-nd-accent'
            : 'bg-nd-surface/40 text-nd-text-muted'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>

      <div
        className={`max-w-[80%] rounded-2xl border px-4 py-3 ${
          isUser
            ? 'border-nd-accent/25 bg-nd-accent/[0.08]'
            : 'border-nd-text-muted/15 bg-nd-surface/50'
        }`}
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted">
            {message.role}
          </span>
          <span className="text-[10px] text-nd-text-muted/70">
            {message.provider ?? 'local'}
            {message.latencyMs ? ` · ${message.latencyMs}ms` : ''}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-nd-text/90">{message.content}</p>
      </div>
    </article>
  );
}
