import { EmptyState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'

export interface SymbolItem {
  name: string
  kind: string
  line: number
  children: SymbolItem[]
}

export interface SymbolNavigatorProps {
  symbols: SymbolItem[]
  supported: boolean
  onJump: (line: number) => void
}

/**
 * ND-023 Symbol Navigator, scoped to "Jump" only — real navigation-tree
 * data from Monaco's TypeScript worker (`getNavigationTree`, the same data
 * VS Code's outline view uses) for TS/JS files. Peek/Rename/Find
 * references/Pin need a real multi-file language service integration this
 * slice doesn't build; Explain/Add to AI context need Epic 9's model
 * router. Other languages have no symbol provider in Monaco's bundled
 * workers, so the panel says so rather than showing an empty list that
 * looks broken.
 */
export function SymbolNavigator({
  symbols,
  supported,
  onJump
}: SymbolNavigatorProps): React.JSX.Element {
  if (!supported) {
    return (
      <EmptyState
        title="No symbol provider for this language"
        description="Real symbol outlines are only available for TypeScript and JavaScript today."
      />
    )
  }

  if (symbols.length === 0) {
    return <EmptyState title="No symbols found" />
  }

  return (
    <ul className="flex flex-col gap-0.5 overflow-auto">
      {symbols.map((symbol, index) => (
        <SymbolNode
          key={`${symbol.name}:${symbol.line}:${index}`}
          symbol={symbol}
          depth={0}
          onJump={onJump}
        />
      ))}
    </ul>
  )
}

function SymbolNode({
  symbol,
  depth,
  onJump
}: {
  symbol: SymbolItem
  depth: number
  onJump: (line: number) => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `symbol:${symbol.name}:${symbol.line}:${depth}`,
    groupId: 'build-studio-symbols',
    onActivate: () => onJump(symbol.line)
  })

  return (
    <li>
      <button
        ref={ref}
        type="button"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onJump(symbol.line)}
        className="flex min-h-[1.75rem] w-full items-center gap-1 truncate text-left text-meta text-text-primary hover:bg-surface-raised/60"
      >
        <span className="text-text-tertiary">{symbol.kind}</span> {symbol.name}
      </button>
      {symbol.children.length > 0 && (
        <ul>
          {symbol.children.map((child, index) => (
            <SymbolNode
              key={`${child.name}:${child.line}:${index}`}
              symbol={child}
              depth={depth + 1}
              onJump={onJump}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
