import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import type { CommandSafety } from '../../../shared/ide/ideContracts';

interface SafeCommandConfirmModalProps {
  command: string;
  args: string[];
  cwd: string;
  safety: CommandSafety;
  label: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SafeCommandConfirmModal({
  command, args, cwd, safety, label, description, onConfirm, onCancel
}: SafeCommandConfirmModalProps) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const isDangerous = safety === 'dangerous';
  const canConfirm = !isDangerous || typed === 'CONFIRM';

  // Focus trap
  useEffect(() => {
    const el = isDangerous ? inputRef.current : cancelRef.current;
    el?.focus();
  }, [isDangerous]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const cmdPreview = [command, ...args].join(' ');

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cmd-confirm-title"
      aria-describedby="cmd-confirm-desc"
    >
      <div className="w-full max-w-md rounded-2xl border border-nd-text-muted/20 bg-nd-bg p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          {isDangerous ? (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-nd-danger" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-nd-warning" aria-hidden="true" />
          )}
          <div className="flex-1">
            <h2 id="cmd-confirm-title" className="font-semibold text-nd-text">
              {isDangerous ? 'Dangerous Command' : 'Confirm Command'}
            </h2>
            <p id="cmd-confirm-desc" className="mt-0.5 text-xs text-nd-text-muted">
              {isDangerous
                ? 'This command may be irreversible. Type CONFIRM to proceed.'
                : 'Review the command before running.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="rounded-lg p-1 text-nd-text-muted hover:bg-nd-surface/60 hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mb-4 space-y-2">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted">Command</span>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-nd-surface/60 p-2 text-[11px] font-mono text-nd-text">
              {cmdPreview}
            </pre>
          </div>
          <div className="flex gap-4 text-[11px] text-nd-text-muted">
            <span><strong className="text-nd-text-muted/80">Label:</strong> {label}</span>
            <span><strong className="text-nd-text-muted/80">Safety:</strong> <span className={isDangerous ? 'text-nd-danger' : 'text-nd-warning'}>{safety}</span></span>
          </div>
          {description && (
            <p className="text-[11px] text-nd-text-muted">{description}</p>
          )}
          <div className="text-[11px] text-nd-text-muted/60">
            <span className="font-semibold">CWD:</span> {cwd}
          </div>
        </div>

        {isDangerous && (
          <div className="mb-4">
            <label htmlFor="cmd-confirm-input" className="mb-1.5 block text-xs font-semibold text-nd-danger">
              Type <code>CONFIRM</code> to enable the run button
            </label>
            <input
              id="cmd-confirm-input"
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded-lg border border-nd-danger/30 bg-nd-surface/60 px-3 py-2 text-sm font-mono text-nd-text outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-nd-text-muted/20 bg-nd-surface/40 px-4 py-2 text-sm text-nd-text-muted hover:bg-nd-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 disabled:cursor-not-allowed disabled:opacity-40 ${
              isDangerous
                ? 'bg-nd-danger/20 text-nd-danger hover:bg-nd-danger/30'
                : 'bg-nd-warning/20 text-nd-warning hover:bg-nd-warning/30'
            }`}
          >
            Run
          </button>
        </div>
      </div>
    </div>
  );
}
