import { NavLink, useNavigate } from 'react-router-dom'
import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../primitives/cn'
import type { NavigationDestination } from './navigationDestinations'

export interface NavigationRailItemProps {
  destination: NavigationDestination
  expanded: boolean
}

export function NavigationRailItem({
  destination,
  expanded
}: NavigationRailItemProps): React.JSX.Element {
  const navigate = useNavigate()
  const { ref, isFocused } = useFocusable<HTMLAnchorElement>({
    id: `nav:${destination.id}`,
    groupId: 'nav-rail',
    priority: destination.id === 'home' ? 1 : 0,
    initialFocus: destination.id === 'home',
    onActivate: () => navigate(destination.path)
  })

  return (
    <NavLink
      ref={ref}
      to={destination.path}
      end={destination.path === '/'}
      aria-label={destination.label}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-md px-3 text-meta font-medium text-text-secondary transition-colors',
          'min-h-[var(--ndx-target-min)]',
          expanded ? 'justify-start gap-3' : 'justify-center',
          isActive ? 'bg-surface-raised text-text-primary' : 'hover:bg-surface-raised/60',
          isFocused && 'ring-2 ring-border-focus',
          'focus-visible:ring-2 focus-visible:ring-border-focus'
        )
      }
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-current opacity-60" />
      <span className={expanded ? undefined : 'sr-only'}>{destination.label}</span>
    </NavLink>
  )
}
