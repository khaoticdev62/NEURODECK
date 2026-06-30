import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import { SearchResultRow } from './SearchResultRow'
import { type SearchCategory, type SearchResult, useGlobalSearch } from './useGlobalSearch'

const CATEGORIES: { id: SearchCategory; label: string }[] = [
  { id: 'everywhere', label: 'Everywhere' },
  { id: 'currentWorkspace', label: 'Current Workspace' },
  { id: 'files', label: 'Files' },
  { id: 'code', label: 'Code' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'logs', label: 'Logs' },
  { id: 'browser', label: 'Browser' },
  { id: 'remote', label: 'Remote' }
]

export function GlobalSearch(): React.JSX.Element {
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspaces()
  const { onAction } = useFocusEngine()
  const {
    query,
    setQuery: setQueryBase,
    category,
    setCategory: setCategoryBase,
    results,
    loading,
    errors
  } = useGlobalSearch(activeWorkspace)

  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const setQuery = useCallback(
    (value: string) => {
      setSelectedIndex(0)
      setQueryBase(value)
    },
    [setQueryBase]
  )

  const setCategory = useCallback(
    (value: SearchCategory) => {
      setSelectedIndex(0)
      setCategoryBase(value)
    },
    [setCategoryBase]
  )

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const executeResult = useCallback(
    (result: SearchResult) => {
      if (result.action.kind === 'navigate') {
        navigate(result.action.to)
      } else {
        result.action.run()
      }
    },
    [navigate]
  )

  useEffect(() => {
    return onAction((event) => {
      if (event.phase !== 'press') return
      switch (event.action) {
        case 'nav.up':
          setSelectedIndex((idx) => Math.max(0, idx - 1))
          break
        case 'nav.down':
          setSelectedIndex((idx) => Math.min(results.length - 1, idx + 1))
          break
        case 'confirm':
          if (results[selectedIndex]) {
            executeResult(results[selectedIndex])
          }
          break
        case 'back':
          navigate(-1)
          break
      }
    })
  }, [onAction, results, selectedIndex, executeResult, navigate])

  useEffect(() => {
    const selected = listRef.current?.querySelector('[aria-selected="true"]')
    if (selected instanceof HTMLElement) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)_18rem]">
      <NdxToolWindow title="Search Scope" subtitle={activeWorkspace?.name ?? 'No workspace'}>
        <div role="tablist" aria-label="Search category" className="flex flex-col gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={category === cat.id}
              onClick={() => setCategory(cat.id)}
              className={clsx(
                'rounded-md px-3 py-2 text-left text-meta font-medium transition-colors',
                category === cat.id
                  ? 'bg-[var(--ndx-workbench-row-selected-bg)] text-text-primary'
                  : 'text-text-secondary hover:bg-surface-raised'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </NdxToolWindow>

      <NdxEditorShell title="Global Results">
        <div className="flex h-full min-h-0 flex-col gap-4 p-4">
          <header>
            <h1 className="text-title font-semibold text-text-primary">Search</h1>
            <p className="text-meta text-text-secondary">
              Files, code, tasks, logs, browser tabs, remote hosts, and destinations.
            </p>
          </header>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type to search..."
              aria-label="Search query"
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 pl-10 text-text-primary outline-none ring-border-focus focus:ring-2"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              Search
            </span>
          </div>

          <div
            ref={listRef}
            role="listbox"
            aria-label="Search results"
            className="min-h-0 flex-1 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-2"
          >
            {query.trim().length === 0 && !loading && (
              <p className="p-4 text-center text-sm text-text-secondary">
                Start typing to search across the deck.
              </p>
            )}

            {query.trim().length > 0 && results.length === 0 && !loading && (
              <p className="p-4 text-center text-sm text-text-secondary">
                No results found for &quot;{query}&quot;.
              </p>
            )}

            {results.map((result, index) => (
              <SearchResultRow
                key={result.id}
                result={result}
                selected={index === selectedIndex}
                onSelect={() => {
                  setSelectedIndex(index)
                  executeResult(result)
                }}
              />
            ))}

            {loading && <p className="p-4 text-center text-sm text-text-secondary">Searching...</p>}
          </div>

          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              {results.length} result{results.length === 1 ? '' : 's'}
            </span>
            <span className="hidden sm:inline">
              Up/Down to navigate - Enter to open - Esc to close
            </span>
          </div>
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Search Health" subtitle={loading ? 'Searching' : 'Ready'} side="right">
        {errors.length > 0 ? (
          <div className="rounded-lg border border-error bg-error/10 p-3 text-sm text-error">
            <p className="font-medium">Some sources could not be searched:</p>
            <ul className="mt-1 list-inside list-disc">
              {errors.map((error) => (
                <li key={error.source}>
                  {error.source}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-meta text-text-secondary">
            Search runs against available local renderer sources and reports unavailable providers
            here.
          </p>
        )}
      </NdxToolWindow>
    </div>
  )
}
