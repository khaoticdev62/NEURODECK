import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/overlays/Modal'
import { NAVIGATION_DESTINATIONS } from '../../components/navigation/navigationDestinations'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'
import { useFocusable } from '../../controller/focus/useFocusable'
import { CommandPaletteResultRow } from './CommandPaletteResultRow'

/**
 * ND-009 Universal Command Palette, opened with `Menu`/`commands`. Spec
 * lists nine search domains (screens, commands, files, symbols, workspaces,
 * workflows, agents, settings, recent actions) — only "Screens" has a real
 * source today (the route registry's nav destinations). The rest stay out
 * until their owning services exist (files: Epic 6, workspaces: Epic 5,
 * workflows/agents: Epic 8, settings: Epic 11) rather than searching nothing.
 */
export function CommandPalette(): React.JSX.Element {
  const { registry, subscribe } = useFocusEngine()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => subscribe('commands', () => setOpen((current) => !current)), [subscribe])

  useEffect(() => {
    if (!open) return
    registry.pushTrap(['command-palette'])
    return () => registry.popTrap()
  }, [open, registry])

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return NAVIGATION_DESTINATIONS
    return NAVIGATION_DESTINATIONS.filter((destination) =>
      destination.label.toLowerCase().includes(normalized)
    )
  }, [query])

  const { ref: searchRef } = useFocusable<HTMLInputElement>({
    id: 'command-palette:search',
    groupId: 'command-palette',
    role: 'field',
    priority: 100,
    onActivate: () => {
      // Enter in the search field runs the top-ranked result, same as confirm on a row.
      if (results[0]) {
        registry.focus(`command:${results[0].id}`)
        registry.activate()
      }
    }
  })

  function handleClose(): void {
    setOpen(false)
    setQuery('')
  }

  return (
    <Modal open={open} onClose={handleClose} title="Command Palette">
      <input
        ref={searchRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search commands, files, workspaces, and actions..."
        className="rounded-sm border border-border bg-surface-raised px-3 py-2 text-body text-text-primary outline-none focus-visible:border-border-focus"
      />
      <div className="flex flex-col gap-1">
        <p className="text-meta uppercase tracking-wide text-text-tertiary">Screens</p>
        {results.length === 0 ? (
          <p className="px-3 py-2 text-meta text-text-secondary">No matching screens.</p>
        ) : (
          results.map((destination, index) => (
            <CommandPaletteResultRow
              key={destination.id}
              destination={destination}
              priority={results.length - index}
              onRun={handleClose}
            />
          ))
        )}
      </div>
    </Modal>
  )
}
