import type { IdeMode } from '../../../shared/ide/ideContracts';

type LspStatus = 'ready' | 'starting' | 'missing' | 'error';

interface LanguageModeBadgeProps {
  languageId: string | null;
  displayName: string | null;
  lspStatus: LspStatus;
  ideMode: IdeMode;
}

const MODE_LABELS: Record<IdeMode, string> = {
  IDE_NAVIGATION: 'NAV',
  IDE_EDIT: 'EDIT',
  IDE_PREDICTION: 'PRED',
  IDE_COMMAND: 'CMD',
  IDE_SNIPPET: 'SNIP',
};

const LSP_DOT: Record<LspStatus, { color: string; title: string }> = {
  ready:    { color: 'bg-nd-success', title: 'LSP ready' },
  starting: { color: 'bg-nd-warning animate-pulse', title: 'LSP starting…' },
  missing:  { color: 'bg-nd-text-muted/40', title: 'LSP not installed' },
  error:    { color: 'bg-nd-danger', title: 'LSP error' },
};

export function LanguageModeBadge({ languageId, displayName, lspStatus, ideMode }: LanguageModeBadgeProps) {
  const dot = LSP_DOT[lspStatus];
  const modeLabel = MODE_LABELS[ideMode];

  if (!languageId) return null;

  return (
    <div className="flex items-center gap-1.5" role="status" aria-label={`Language: ${displayName ?? languageId}, LSP: ${lspStatus}, Mode: ${ideMode}`}>
      <span
        className={`inline-block h-2 w-2 rounded-full shrink-0 ${dot.color}`}
        title={dot.title}
        aria-hidden="true"
      />
      <span className="text-[11px] font-mono font-semibold text-nd-text-muted uppercase tracking-wide">
        {displayName ?? languageId}
      </span>
      <span className="rounded bg-nd-accent/10 px-1 py-0.5 text-[10px] font-bold text-nd-accent/80 leading-none">
        {modeLabel}
      </span>
    </div>
  );
}
