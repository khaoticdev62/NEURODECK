export interface GitDiffViewerProps {
  path: string | null
  diff: string | null
  loading: boolean
}

/** Read-only unified diff renderer. Git output is always rendered as text, never HTML. */
export function GitDiffViewer({ path, diff, loading }: GitDiffViewerProps): React.JSX.Element {
  if (!path) {
    return (
      <div className="flex h-full items-center justify-center border border-dashed border-border bg-canvas/40 px-6 text-center text-meta text-text-tertiary">
        Select a changed file to inspect its exact patch.
      </div>
    )
  }

  return (
    <section
      aria-label={`Diff for ${path}`}
      className="flex min-h-0 flex-1 flex-col overflow-hidden border border-border bg-canvas"
    >
      <header className="flex min-h-10 items-center justify-between border-b border-border bg-surface px-3">
        <span className="truncate font-mono text-meta text-text-primary">{path}</span>
        <span className="text-meta uppercase tracking-[0.16em] text-text-tertiary">
          Unified diff
        </span>
      </header>
      {loading ? (
        <p className="p-4 text-meta text-text-secondary">Loading patch…</p>
      ) : !diff ? (
        <p className="p-4 text-meta text-text-secondary">No textual diff is available.</p>
      ) : (
        <pre className="min-h-0 flex-1 overflow-auto py-2 font-mono text-[0.75rem] leading-5">
          {diff.split('\n').map((line, index) => (
            <DiffLine key={`${index}-${line}`} line={line} lineNumber={index + 1} />
          ))}
        </pre>
      )}
    </section>
  )
}

function DiffLine({ line, lineNumber }: { line: string; lineNumber: number }): React.JSX.Element {
  const tone =
    line.startsWith('+++') || line.startsWith('---')
      ? 'text-text-secondary'
      : line.startsWith('+')
        ? 'bg-status-success/10 text-status-success'
        : line.startsWith('-')
          ? 'bg-status-error/10 text-status-error'
          : line.startsWith('@@')
            ? 'bg-status-info/10 text-status-info'
            : 'text-text-secondary'

  return (
    <span className={`grid grid-cols-[3rem_1fr] px-2 ${tone}`}>
      <span
        aria-hidden="true"
        className="select-none border-r border-border pr-2 text-right text-text-tertiary"
      >
        {lineNumber}
      </span>
      <span className="whitespace-pre px-3">{line || ' '}</span>
    </span>
  )
}
