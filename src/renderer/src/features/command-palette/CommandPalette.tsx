import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/overlays/Modal'
import {
  NAVIGATION_DESTINATIONS,
  type NavigationDestination
} from '../../components/navigation/navigationDestinations'
import { useAiSafety } from '../../ai-safety/useAiSafety'
import { useFocusEngine } from '../../controller/focus/useFocusEngine'
import { useFocusable } from '../../controller/focus/useFocusable'
import { CommandPaletteResultRow } from './CommandPaletteResultRow'
import { CommandPaletteToolRow } from './CommandPaletteToolRow'

/** Real screens reachable here that aren't primary nav rail destinations (sub-routes, not cluttering the rail). */
const SECONDARY_SCREENS: NavigationDestination[] = [
  { id: 'ai-timeline', label: 'AI Execution Timeline', path: '/ai/timeline' },
  { id: 'ai-approvals', label: 'Approval Queue', path: '/ai/approvals' }
]

const ALL_SCREENS = [...NAVIGATION_DESTINATIONS, ...SECONDARY_SCREENS]

/**
 * ND-009 Universal Command Palette, opened with `Menu`/`commands`. Spec
 * lists nine search domains (screens, commands, files, symbols, workspaces,
 * workflows, agents, settings, recent actions) — "Screens" (route registry)
 * and now "Tools" (Epic 4's real tool registry) have real sources. The rest
 * stay out until their owning services exist (files: Epic 6, workspaces:
 * Epic 5, workflows/agents: Epic 8, settings: Epic 11).
 */
export function CommandPalette(): React.JSX.Element {
  const { registry: focusRegistry, subscribe } = useFocusEngine()
  const { registry: toolRegistry } = useAiSafety()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => subscribe('commands', () => setOpen((current) => !current)), [subscribe])

  useEffect(() => {
    if (!open) return
    focusRegistry.pushTrap(['command-palette'])
    return () => focusRegistry.popTrap()
  }, [open, focusRegistry])

  const normalized = query.trim().toLowerCase()

  const screenResults = useMemo(
    () => ALL_SCREENS.filter((destination) => destination.label.toLowerCase().includes(normalized)),
    [normalized]
  )
  // Not memoized: ToolRegistry has no change notification, and the list is
  // tiny — recomputing every render is cheap and always reflects newly
  // registered tools, rather than risking a stale snapshot.
  const toolResults = toolRegistry
    .list()
    .filter((tool) => tool.title.toLowerCase().includes(normalized))

  const { ref: searchRef } = useFocusable<HTMLInputElement>({
    id: 'command-palette:search',
    groupId: 'command-palette',
    role: 'field',
    priority: 100,
    onActivate: () => {
      // Enter in the search field runs the top-ranked result, same as confirm on a row.
      const topId = screenResults[0]
        ? `command:${screenResults[0].id}`
        : toolResults[0]
          ? `tool:${toolResults[0].id}`
          : null
      if (topId) {
        focusRegistry.focus(topId)
        focusRegistry.activate()
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
      <div className="flex flex-col gap-3">
        <div>
          <p className="px-3 text-meta uppercase tracking-wide text-text-tertiary">Screens</p>
          {screenResults.length === 0 ? (
            <p className="px-3 py-2 text-meta text-text-secondary">No matching screens.</p>
          ) : (
            screenResults.map((destination, index) => (
              <CommandPaletteResultRow
                key={destination.id}
                destination={destination}
                priority={screenResults.length - index}
                onRun={handleClose}
              />
            ))
          )}
        </div>
        {toolResults.length > 0 && (
          <div>
            <p className="px-3 text-meta uppercase tracking-wide text-text-tertiary">Tools</p>
            {toolResults.map((tool, index) => (
              <CommandPaletteToolRow
                key={tool.id}
                tool={tool}
                priority={toolResults.length - index}
                onRun={handleClose}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
