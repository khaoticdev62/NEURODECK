import { clsx } from 'clsx'
import type { SearchResult } from './useGlobalSearch'

interface SearchResultRowProps {
  result: SearchResult
  selected: boolean
  onSelect: (result: SearchResult) => void
}

function sourceBadge(source: SearchResult['source']): string {
  switch (source) {
    case 'route':
      return 'RT'
    case 'workspace':
      return 'WS'
    case 'file':
      return 'FL'
    case 'git-change':
      return 'GC'
    case 'git-commit':
      return 'GH'
    case 'terminal':
      return 'TM'
    case 'workflow':
      return 'WF'
    case 'workflow-run':
      return 'WR'
    case 'agent':
      return 'AG'
    case 'agent-run':
      return 'AR'
    case 'model':
      return 'MD'
    case 'recovery':
      return 'RC'
    case 'browser-tab':
      return 'BR'
    case 'remote-host':
      return 'RH'
    default:
      return 'ND'
  }
}

export function SearchResultRow({
  result,
  selected,
  onSelect
}: SearchResultRowProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(result)}
      className={clsx(
        'flex min-h-[56px] w-full items-center gap-3 border px-3 py-2 text-left transition-colors',
        selected
          ? 'border-[var(--ndx-workbench-border-active)] bg-[var(--ndx-workbench-row-selected-bg)] text-text-primary'
          : 'border-transparent text-text-secondary hover:border-[var(--ndx-workbench-border)] hover:bg-[var(--ndx-workbench-panel-bg)] hover:text-text-primary'
      )}
    >
      <span className="flex h-8 w-9 shrink-0 items-center justify-center border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-panel-bg)] text-meta font-semibold text-text-tertiary">
        {sourceBadge(result.source)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-body font-medium text-text-primary">{result.title}</div>
        <div className="truncate text-meta text-text-tertiary">{result.subtitle}</div>
      </div>
    </button>
  )
}
