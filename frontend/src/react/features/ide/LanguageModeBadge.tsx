import { Badge } from '../../components/primitives/Badge';
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

const LSP_DOT: Record<LspStatus, { tone: 'success' | 'warning' | 'neutral' | 'danger'; title: string }> = {
  ready:    { tone: 'success', title: 'LSP ready' },
  starting: { tone: 'warning', title: 'LSP starting…' },
  missing:  { tone: 'neutral', title: 'LSP not installed' },
  error:    { tone: 'danger', title: 'LSP error' },
};

export function LanguageModeBadge({ languageId, displayName, lspStatus, ideMode }: LanguageModeBadgeProps) {
  const dot = LSP_DOT[lspStatus];
  const modeLabel = MODE_LABELS[ideMode];

  if (!languageId) return null;

  return (
    <div className="flex items-center gap-1.5" role="status" aria-label={`Language: ${displayName ?? languageId}, LSP: ${lspStatus}, Mode: ${ideMode}`}>
      <Badge tone={dot.tone} variant="outline" dot size="sm">
        {displayName ?? languageId}
      </Badge>
      <Badge tone="accent" variant="fill" size="sm">{modeLabel}</Badge>
    </div>
  );
}
