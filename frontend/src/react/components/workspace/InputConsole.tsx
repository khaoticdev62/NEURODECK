import { Mic, Paperclip, ScanLine, SendHorizontal } from 'lucide-react';
import { Badge } from '../primitives/Badge';

interface InputConsoleProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value?: string) => void;
  provider: string;
  hasContext: boolean;
  providerCount: number;
}

export function InputConsole({ value, onChange, onSend, provider, hasContext, providerCount }: InputConsoleProps) {
  return (
    <div className="border-t border-nd-text-muted/15 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-nd-text-muted">
        <Badge tone="accent">{provider}</Badge>
        <Badge tone={hasContext ? 'success' : 'warning'}>{hasContext ? 'context attached' : 'no context'}</Badge>
        <Badge tone={providerCount > 1 ? 'success' : 'neutral'}>{providerCount} provider(s) ready</Badge>
        <span className="ml-auto text-nd-text-muted/60">Ctrl/Cmd + Enter to send</span>
      </div>

      <div className="flex items-end gap-2 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/50 p-2 focus-within:border-nd-accent/40 focus-within:shadow-focus">
        <div className="flex gap-1 pb-2 pl-2">
          <IconBtn title="Attach file"><Paperclip className="h-4 w-4" /></IconBtn>
          <IconBtn title="Voice input"><Mic className="h-4 w-4" /></IconBtn>
          <IconBtn title="Screenshot"><ScanLine className="h-4 w-4" /></IconBtn>
        </div>

        <textarea
          id="user-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend(e.currentTarget.value);
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              onSend(e.currentTarget.value);
            }
          }}
          placeholder="Enter command or type message..."
          aria-label="Message input"
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm leading-5 text-nd-text outline-none placeholder:text-nd-text-muted/70"
          rows={1}
        />

        <button
          type="button"
          onClick={() => onSend()}
          aria-label="Send message"
          className="mb-0.5 inline-flex h-9 items-center gap-1.5 rounded-xl bg-nd-accent px-3 text-sm font-semibold text-nd-bg transition hover:brightness-110"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function IconBtn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      className="rounded-lg p-1.5 text-nd-text-muted hover:bg-nd-surface/50 hover:text-nd-text/80"
    >
      {children}
    </button>
  );
}
