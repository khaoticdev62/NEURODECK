import { useState, useRef, useEffect, useId, KeyboardEvent } from "react";
import { BrainCircuit, ChevronDown, ChevronUp, Send, Trash2 } from "lucide-react";
import { Button } from "../../../components/primitives/Button";
import { IconButton } from "../../../components/primitives/IconButton";
import { useMentorChat } from "../hooks/useMentorChat";

interface MentorPanelProps {
  /** Scoped context (lab/alert title + objectives/description — never answers). */
  context: string;
  /** Seed the first mentor message so it feels contextual rather than blank. */
  greeting?: string;
}

export function MentorPanel({ context, greeting }: MentorPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputId = useId();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, streaming, streamBuffer, send, clear } = useMentorChat(context);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamBuffer]);

  function handleSend() {
    const q = input.trim();
    if (!q || streaming) return;
    setInput("");
    send(q);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  const hasContent = messages.length > 0 || streaming;

  return (
    <div className="border-t border-nd-border-subtle bg-nd-surface-base/60">
      {/* Toggle bar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-nd-surface/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40 focus-visible:ring-inset"
      >
        <BrainCircuit className="h-3.5 w-3.5 shrink-0 text-nd-accent-primary" aria-hidden="true" />
        <span className="flex-1 text-[11px] font-semibold text-nd-text-secondary">
          Ask Alex — SOC Mentor
        </span>
        {streaming && (
          <span className="animate-pulse text-[10px] text-nd-accent-primary">thinking…</span>
        )}
        <div className="text-nd-text-muted/40">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="flex flex-col" style={{ height: "220px" }}>
          {/* Message log */}
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-2">
            {/* Static greeting */}
            {!hasContent && (
              <div className="flex items-start gap-2">
                <MentorAvatar />
                <div className="max-w-prose rounded-lg border border-nd-border-subtle/50 bg-nd-surface/40 px-3 py-2 text-[11px] leading-relaxed text-nd-text-secondary">
                  {greeting ??
                    "What's your question? I'll guide you — I won't hand you the answer."}
                </div>
              </div>
            )}

            {messages.map((msg, i) =>
              msg.role === "student" ? (
                <div key={i} className="flex justify-end gap-2">
                  <div className="max-w-[80%] rounded-lg bg-nd-accent/15 px-3 py-2 text-[11px] leading-relaxed text-nd-text-primary">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-2">
                  <MentorAvatar />
                  <div className="max-w-prose rounded-lg border border-nd-border-subtle/50 bg-nd-surface/40 px-3 py-2 text-[11px] leading-relaxed text-nd-text-secondary">
                    {msg.content}
                  </div>
                </div>
              )
            )}

            {/* Live stream buffer */}
            {streaming && streamBuffer && (
              <div className="flex items-start gap-2">
                <MentorAvatar />
                <div className="max-w-prose rounded-lg border border-nd-border-subtle/50 bg-nd-surface/40 px-3 py-2 text-[11px] leading-relaxed text-nd-text-secondary">
                  {streamBuffer}
                  <span
                    className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-nd-accent-primary"
                    aria-hidden="true"
                  />
                </div>
              </div>
            )}

            {/* Thinking indicator — before first token */}
            {streaming && !streamBuffer && (
              <div className="flex items-center gap-2">
                <MentorAvatar />
                <div className="flex gap-1 px-3 py-2">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-nd-accent-primary/50 motion-reduce:animate-none"
                      style={{ animationDelay: `${i * 150}ms` }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <div className="flex items-end gap-2 border-t border-nd-border-subtle/50 px-3 py-2">
            <label htmlFor={inputId} className="sr-only">
              Message Alex
            </label>
            <textarea
              id={inputId}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              placeholder="Ask Alex a question… (Ctrl+Enter to send)"
              className="flex-1 resize-none rounded-lg border border-nd-border-subtle bg-nd-surface-base/60 px-2.5 py-1.5 text-[11px] text-nd-text-primary placeholder:text-nd-text-muted/30 focus:border-nd-accent-primary/40 focus:outline-none focus:ring-1 focus:ring-nd-accent-primary/20 disabled:opacity-50"
              style={{ maxHeight: "80px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
              }}
            />
            <div className="flex shrink-0 gap-1">
              {messages.length > 0 && (
                <IconButton
                  size="sm"
                  variant="ghost"
                  onClick={clear}
                  aria-label="Clear conversation"
                  className="text-nd-text-muted/40 hover:text-nd-accent-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              )}
              <Button
                size="xs"
                variant="soft"
                icon={Send}
                onClick={handleSend}
                disabled={!input.trim() || streaming}
                aria-label="Send message"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MentorAvatar() {
  return (
    <div
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-nd-accent/20"
      aria-hidden="true"
    >
      <span className="text-[9px] font-bold text-nd-accent-primary">A</span>
    </div>
  );
}
