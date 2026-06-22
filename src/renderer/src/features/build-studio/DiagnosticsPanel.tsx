import { EmptyState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'

export interface DiagnosticItem {
  severity: 'error' | 'warning' | 'info' | 'hint'
  message: string
  code: string | number | undefined
  line: number
  path: string
}

export interface DiagnosticsPanelProps {
  diagnostics: DiagnosticItem[]
  onSelect: (diagnostic: DiagnosticItem) => void
}

const SEVERITY_ORDER: DiagnosticItem['severity'][] = ['error', 'warning', 'info', 'hint']

/**
 * ND-024 Diagnostics and Problems, grouped by severity then file — real
 * `monaco.editor.IMarker`s from Monaco's bundled TypeScript worker for
 * open TS/JS files. "By source," "By test," and "By accessibility
 * category" groupings are deferred — no test runner or accessibility
 * linter is wired into the editor yet. Bulk operations (fix all, repair
 * plan, export report) need either a real code-fix provider or an AI
 * planner (Epic 9) and are not fabricated.
 */
export function DiagnosticsPanel({
  diagnostics,
  onSelect
}: DiagnosticsPanelProps): React.JSX.Element {
  if (diagnostics.length === 0) {
    return <EmptyState title="No problems" description="Open files show real diagnostics here." />
  }

  return (
    <div className="flex flex-col gap-3 overflow-auto">
      {SEVERITY_ORDER.map((severity) => {
        const items = diagnostics.filter((diagnostic) => diagnostic.severity === severity)
        if (items.length === 0) return null
        return (
          <section key={severity}>
            <p className="mb-1 text-meta font-semibold uppercase tracking-[0.12em] text-text-tertiary">
              {severity} ({items.length})
            </p>
            <ul className="flex flex-col gap-1">
              {items.map((item, index) => (
                <DiagnosticRow
                  key={`${item.path}:${item.line}:${index}`}
                  item={item}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function DiagnosticRow({
  item,
  onSelect
}: {
  item: DiagnosticItem
  onSelect: (diagnostic: DiagnosticItem) => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `diagnostic:${item.path}:${item.line}:${item.message}`,
    groupId: 'build-studio-diagnostics',
    onActivate: () => onSelect(item)
  })

  return (
    <li>
      <button
        ref={ref}
        type="button"
        onClick={() => onSelect(item)}
        className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1 text-left hover:bg-surface-raised/60"
      >
        <span className="text-meta text-text-primary">{item.message}</span>
        <span className="text-meta text-text-tertiary">
          {item.path}:{item.line} {item.code ? `[${item.code}]` : ''}
        </span>
      </button>
    </li>
  )
}
