export function NdxBreadcrumbs({ items }: { items: string[] }): React.JSX.Element {
  return (
    <nav
      aria-label="Breadcrumbs"
      className="flex h-[var(--ndx-workbench-breadcrumb-height)] items-center gap-1 overflow-hidden border-b border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-editor-bg)] px-3 text-meta text-text-tertiary"
    >
      {items.length === 0 ? (
        <span>No file selected</span>
      ) : (
        items.map((item, index) => (
          <span key={`${item}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 && <span aria-hidden>›</span>}
            <span className={index === items.length - 1 ? 'truncate text-text-secondary' : ''}>
              {item}
            </span>
          </span>
        ))
      )}
    </nav>
  )
}
