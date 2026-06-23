import { clsx } from 'clsx'
import type { SearchResult } from './useGlobalSearch'

interface SearchResultRowProps {
  result: SearchResult
  selected: boolean
  onSelect: (result: SearchResult) => void
}

function sourceIcon(source: SearchResult['source']): string {
  switch (source) {
    case 'route':
      return '↗'
    case 'workspace':
      return '📁'
    case 'file':
      return '📄'
    case 'git-change':
      return '🔄'
    case 'git-commit':
      return '🔀'
    case 'terminal':
      return '💻'
    case 'workflow':
      return '⚙️'
    case 'workflow-run':
      return '▶️'
    case 'agent':
      return '🤖'
    case 'agent-run':
      return '🚀'
    case 'model':
      return '🧠'
    case 'recovery':
      return '🛡️'
    case 'browser-tab':
      return '🌐'
    case 'remote-host':
      return '🔌'
    default:
      return '•'
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
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
        selected
          ? 'bg-cyber-500/20 text-white ring-1 ring-cyber-500'
          : 'text-neutral-200 hover:bg-cyber-900/40 hover:text-white'
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-800 text-sm">
        {sourceIcon(result.source)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{result.title}</div>
        <div className="truncate text-xs text-neutral-400">{result.subtitle}</div>
      </div>
    </button>
  )
}
