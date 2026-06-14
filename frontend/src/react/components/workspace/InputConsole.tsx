import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Keyboard,
  Mic,
  Paperclip,
  ScanLine,
  SendHorizontal,
} from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { IconButton } from '../../components/primitives/IconButton';
import { bridgeInvoke, neurodeckApi } from '../../services/bridgeAdapter';

interface InputConsoleProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value?: string) => void;
  provider: string;
  model?: string;
  hasContext: boolean;
  providerCount: number;
  onAttachFile?: (paths: string[]) => void;
}

export function InputConsole({
  value,
  onChange,
  onSend,
  provider,
  model,
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
    <div
      className="border-t border-nd-border-subtle bg-nd-surface/50 p-3 backdrop-blur-sm"
      data-controller-zone="form"
    >
      {/* Status row */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="accent" variant="outline">
          {provider}
        </Badge>
        {model && (
          <Badge tone="neutral" variant="outline">
            {model}
          </Badge>
        )}
        <Badge tone={hasContext ? 'success' : 'warning'}>
          {hasContext ? 'context attached' : 'no context'}
        </Badge>
        <Badge tone={providerCount > 1 ? 'success' : 'neutral'}>
          {providerCount} provider{providerCount === 1 ? '' : 's'} ready
        </Badge>
        <span className="ml-auto inline-flex items-center gap-1 text-nd-text-muted">
          <Keyboard className="h-3 w-3" aria-hidden="true" />
          Enter to send
        </span>
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 rounded-2xl border border-nd-border-subtle bg-nd-surface-raised/60 p-2 shadow-sm transition focus-within:border-nd-border-focus focus-within:bg-nd-surface-raised focus-within:shadow-focus">
        {/* Attachments */}
        <div className="flex gap-1 pb-1 pl-1">
          <IconButton
            aria-label="Attach file"
            title="Attach file"
            size="md"
            variant="subtle"
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
          </IconButton>
          <IconButton
            aria-label={isRecording ? 'Stop recording' : 'Voice input'}
            title={isRecording ? 'Stop recording' : 'Voice input'}
            size="md"
            variant={isRecording ? 'accent' : 'subtle'}
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
          </IconButton>
          <IconButton
            aria-label="Attach screenshot"
            title="Attach screenshot"
            size="md"
            variant="subtle"
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
          </IconButton>
        </div>

        <textarea
          ref={textareaRef}
          id="user-input"
          data-testid="chat-input"
          data-controller-default="true"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            } else if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Command NEURODECK: ask anything, run /commands, or describe what you want to build..."
          aria-label="Message input"
          rows={1}
          className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-sm leading-5 text-nd-text-primary outline-none placeholder:text-nd-text-muted/70"
        />

        {/* Send */}
        <IconButton
          aria-label="Send message"
          title="Send message"
          size="md"
          variant="accent"
          disabled={!value.trim()}
          onClick={handleSend}
          data-testid="chat-send-btn"
        >
          <SendHorizontal className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}
