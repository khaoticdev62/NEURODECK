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
    <div className="grid h-full min-h-0 grid-cols-1 gap-2 overflow-hidden docked:grid-cols-[minmax(0,1fr)_18rem] docked-2k:grid-cols-[15rem_minmax(0,1fr)_18rem]">
      <div className="hidden min-h-0 docked-2k:block">
        <NdxToolWindow title="Search Scope" subtitle={activeWorkspace?.name ?? 'No workspace'}>
          <SearchCategories category={category} onSelect={setCategory} vertical />
        </NdxToolWindow>
      </div>

      <NdxEditorShell title="Global Results">
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 p-3 deck:p-4">
          <header className="ndx-os-panel overflow-hidden">
            <div className="ndx-console-ruler" aria-hidden="true" />
            <div className="p-3">
              <p className="text-meta uppercase tracking-wide text-text-tertiary">Command index</p>
              <h1 className="mt-1 text-title font-semibold text-text-primary">Search</h1>
              <p className="mt-1 text-meta text-text-secondary">
                Files, code, tasks, logs, browser tabs, remote hosts, and destinations.
              </p>
            </div>
          </header>

          <div className="docked-2k:hidden">
            <SearchCategories category={category} onSelect={setCategory} />
          </div>

          <div className="border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-panel-bg)]">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
              <span className="text-meta font-semibold uppercase tracking-wide text-text-tertiary">
                Query
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type to search..."
                aria-label="Search query"
                className="min-h-[44px] min-w-0 bg-transparent text-body text-text-primary outline-none placeholder:text-text-tertiary focus-visible:ring-0"
              />
              <span className="hidden text-meta text-text-tertiary deck:inline">
                {activeWorkspace?.name ?? 'All sources'}
              </span>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="border border-status-error/60 bg-status-error/10 p-3 text-meta text-status-error">
              <p className="font-medium">Some sources could not be searched.</p>
              <ul className="mt-1 list-inside list-disc">
                {errors.map((error) => (
                  <li key={error.source}>
                    {error.source}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            ref={listRef}
            role="listbox"
            aria-label="Search results"
            className="min-h-0 flex-1 overflow-y-auto border border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-tool-bg)] p-2"
          >
            {query.trim().length === 0 && !loading && (
              <p className="p-4 text-center text-meta text-text-secondary">
                Start typing to search across the deck.
              </p>
            )}

            {query.trim().length > 0 && results.length === 0 && !loading && (
              <p className="p-4 text-center text-meta text-text-secondary">
                No results found for &quot;{query}&quot;.
              </p>
            )}

            <div className="flex flex-col gap-1">
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
            </div>

            {loading && (
              <p className="p-4 text-center text-meta text-text-secondary">Searching...</p>
            )}
          </div>

          <div className="flex items-center justify-between text-meta text-text-secondary">
            <span>
              {results.length} result{results.length === 1 ? '' : 's'}
            </span>
            <span className="hidden deck:inline">
              Up/Down to navigate - Enter to open - Esc to close
            </span>
          </div>
        </div>
      </NdxEditorShell>

      <div className="hidden min-h-0 docked:block">
        <NdxToolWindow
          title="Search Health"
          subtitle={loading ? 'Searching' : 'Ready'}
          side="right"
        >
          {errors.length > 0 ? (
            <div className="border border-status-error/60 bg-status-error/10 p-3 text-meta text-status-error">
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
    </div>
  )
}

function SearchCategories({
  category,
  onSelect,
  vertical = false
}: {
  category: SearchCategory
  onSelect: (category: SearchCategory) => void
  vertical?: boolean
}): React.JSX.Element {
  return (
    <div
      role={vertical ? undefined : 'tablist'}
      aria-label="Search category"
      className={clsx(vertical ? 'flex flex-col gap-1' : 'flex gap-1 overflow-x-auto pb-1')}
    >
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          role={vertical ? undefined : 'tab'}
          aria-selected={category === cat.id}
          onClick={() => onSelect(cat.id)}
          className={clsx(
            'min-h-[40px] shrink-0 border px-3 text-left text-meta font-medium transition-colors',
            category === cat.id
              ? 'border-[var(--ndx-workbench-border-active)] bg-[var(--ndx-workbench-row-selected-bg)] text-text-primary'
              : 'border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-panel-bg)] text-text-secondary hover:text-text-primary'
          )}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
