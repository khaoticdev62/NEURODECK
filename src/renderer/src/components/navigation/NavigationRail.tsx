import { NavLink } from 'react-router-dom'
import { cn } from '../primitives/cn'
import { NAVIGATION_DESTINATIONS } from './navigationDestinations'

export interface NavigationRailProps {
  /** Focus mode collapses navigation entirely (wireframe §3.3) — render nothing rather than a hidden husk. */
  hidden?: boolean
  expanded?: boolean
}

/**
 * Primary Navigation Rail (wireframe §6.2). `LB/RB` cycling, `X` quick actions,
 * and `L3` pin/unpin are controller behaviors wired up in Epic 2 — this
 * component owns layout, the destination list, and route activation only.
 */
export function NavigationRail({
  hidden = false,
  expanded = false
}: NavigationRailProps): React.JSX.Element | null {
  if (hidden) return null

  return (
    <nav
      aria-label="Primary"
      className="flex flex-col gap-1 overflow-y-auto border-r border-border bg-surface py-3"
      style={{
        width: expanded ? 'var(--ndx-rail-primary-expanded)' : 'var(--ndx-rail-primary-collapsed)',
        zIndex: 'var(--ndx-z-rail)'
      }}
    >
      {NAVIGATION_DESTINATIONS.map((destination) => (
        <NavLink
          key={destination.id}
          to={destination.path}
          end={destination.path === '/'}
          aria-label={destination.label}
          className={({ isActive }) =>
            cn(
              'flex items-center rounded-md px-3 text-meta font-medium text-text-secondary transition-colors',
              'min-h-[var(--ndx-target-min)]',
              expanded ? 'justify-start gap-3' : 'justify-center',
              isActive ? 'bg-surface-raised text-text-primary' : 'hover:bg-surface-raised/60',
              'focus-visible:ring-2 focus-visible:ring-border-focus'
            )
          }
        >
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-current opacity-60" />
          <span className={expanded ? undefined : 'sr-only'}>{destination.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
