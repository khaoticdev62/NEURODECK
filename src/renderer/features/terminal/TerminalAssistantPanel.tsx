import { X } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";

export type TerminalAssistantPanelProps = {
  prompt: string;
  suggestions: string[];
  onPromptChange: (value: string) => void;
  onSuggest: () => void;
  onExplain: () => void;
  onRunCommand: (command: string) => void;
  onClose: () => void;
};

export function TerminalAssistantPanel({
  prompt,
  suggestions,
  onPromptChange,
  onSuggest,
  onExplain,
  onRunCommand,
  onClose,
}: TerminalAssistantPanelProps) {
  return (
    <aside className="min-h-0 overflow-hidden rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
            AI Assistant
          </p>
          <h3 className="text-sm font-semibold text-nd-text-primary">Command help</h3>
        </div>
        <IconButton aria-label="Close command help" variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>

      <div className="mt-3 space-y-2">
        <label htmlFor="terminal-assistant-input" className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">
            Assistant prompt
          </span>
          <textarea
            id="terminal-assistant-input"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Ask for the next command, explain the last error, or request a safer alternative..."
            className="mt-1 min-h-touch min-h-28 w-full rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-3 text-sm text-nd-text-primary outline-none focus:border-nd-accent-primary/40 focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40"
          />
        </label>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="min-h-touch" onClick={() => void onSuggest()}>
            Suggest Commands
          </Button>
          <Button size="sm" variant="ghost" className="min-h-touch" onClick={() => void onExplain()}>
            Explain Last Command
          </Button>
        </div>
        <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-3 text-xs text-nd-text-muted">
          <div className="font-semibold text-nd-text-primary">Suggested commands</div>
          <div className="mt-2 space-y-2">
            {suggestions.length === 0 ? (
              <div className="text-nd-text-muted">No suggestions yet.</div>
            ) : (
              suggestions.map((command) => (
                <Button
                  key={command}
                  variant="ghost"
                  size="xs"
                  fullWidth
                  className="min-h-touch justify-start font-mono text-[11px]"
                  onClick={() => void onRunCommand(command)}
                >
                  {command}
                </Button>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
