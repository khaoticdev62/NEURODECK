import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Keyboard,
  Mic,
  Paperclip,
  ScanLine,
  SendHorizontal,
} from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { bridgeInvoke, neurodeckApi } from '../../services/bridgeAdapter';

interface InputConsoleProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value?: string) => void;
  provider: string;
  hasContext: boolean;
  providerCount: number;
  onAttachFile?: (paths: string[]) => void;
}

export function InputConsole({
  value,
  onChange,
  onSend,
  provider,
  hasContext,
  providerCount,
  onAttachFile,
}: InputConsoleProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 128);
    el.style.height = `${Math.max(next, 40)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSend = useCallback(() => {
    if (!value.trim()) return;
    onSend(value);
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }
  }, [onSend, value]);

  return (
    <div className="border-t border-nd-text-muted/15 bg-nd-surface/30 p-3" data-controller-zone="form">
      {/* Status row */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="accent">{provider}</Badge>
        <Badge tone={hasContext ? 'success' : 'warning'}>
          {hasContext ? 'context attached' : 'no context'}
        </Badge>
        <Badge tone={providerCount > 1 ? 'success' : 'neutral'}>
          {providerCount} provider{providerCount === 1 ? '' : 's'} ready
        </Badge>
        <span className="ml-auto flex items-center gap-1 text-nd-text-muted/60">
          <Keyboard className="h-3 w-3" />
          Ctrl/Cmd + Enter to send
        </span>
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/60 p-2 shadow-sm transition focus-within:border-nd-accent/40 focus-within:bg-nd-surface/80 focus-within:shadow-focus">
        {/* Attachments */}
        <div className="flex gap-0.5 pb-1.5 pl-1.5">
          <IconBtn
            title="Attach file"
            onClick={async () => {
              const api = (window as unknown as { electronAPI?: { showOpenDialog?: (opts: unknown) => Promise<{ canceled: boolean; filePaths: string[] }> } }).electronAPI;
              if (!api?.showOpenDialog) return;
              const result = await api.showOpenDialog({
                properties: ['openFile', 'multiSelections'],
                filters: [
                  { name: 'Code & Text', extensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'md', 'txt', 'json', 'toml', 'yaml'] },
                  { name: 'All Files', extensions: ['*'] },
                ],
              });
              if (!result.canceled && result.filePaths.length > 0) {
                onAttachFile?.(result.filePaths);
              }
            }}
          >
            <Paperclip className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            title={isRecording ? 'Stop recording' : 'Voice input'}
            active={isRecording}
            onClick={async () => {
              if (isRecording) {
                setIsRecording(false);
                const { transcript } = await neurodeckApi.voice.stop();
                if (transcript) onChange(value ? `${value} ${transcript}` : transcript);
              } else {
                const { ok } = await neurodeckApi.voice.start();
                if (ok) setIsRecording(true);
              }
            }}
          >
            <Mic className="h-4 w-4" />
          </IconBtn>
          <IconBtn
            title="Attach screenshot"
            onClick={async () => {
              try {
                const result = await bridgeInvoke<{ base64?: string }>('read_last_screenshot');
                if (result?.base64) {
                  const tag = '[screenshot attached]';
                  onChange(value ? `${value}\n${tag}` : tag);
                }
              } catch (_) { /* no screenshot available */ }
            }}
          >
            <ScanLine className="h-4 w-4" />
          </IconBtn>
        </div>

        <textarea
          ref={textareaRef}
          id="user-input"
          data-controller-default="true"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask anything, run /commands, or describe what you want to build..."
          aria-label="Message input"
          rows={1}
          className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-sm leading-5 text-nd-text outline-none placeholder:text-nd-text-muted/50"
        />

        {/* Send */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!value.trim()}
          aria-label="Send message"
          className="mb-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-nd-accent text-nd-bg transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick, active }: { children: React.ReactNode; title: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      aria-label={title}
      aria-pressed={active}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-nd-surface/60 active:scale-95 ${
        active ? 'text-nd-accent animate-pulse' : 'text-nd-text-muted hover:text-nd-text/80'
      }`}
    >
      {children}
    </button>
  );
}
