import { NavLink, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../primitives/cn'
import { NavigationIcon } from './navigationIcons'
import type { NavigationDestination } from './navigationDestinations'

export interface NavigationRailItemProps {
  destination: NavigationDestination
  expanded: boolean
}

const MotionNavLink = motion.create(NavLink)

export function NavigationRailItem({
  destination,
  expanded
}: NavigationRailItemProps): React.JSX.Element {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const { ref, isFocused } = useFocusable<HTMLAnchorElement>({
    id: `nav:${destination.id}`,
    groupId: 'nav-rail',
    priority: destination.id === 'home' ? 1 : 0,
    initialFocus: destination.id === 'home',
    onActivate: () => navigate(destination.path)
  })

  return (
    <MotionNavLink
      ref={ref}
      to={destination.path}
      end={destination.path === '/'}
      aria-label={destination.label}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
      className={({ isActive }: { isActive: boolean }) =>
        cn(
          'flex items-center rounded-md px-3 text-meta font-medium transition-colors',
          'min-h-[var(--ndx-target-min)]',
          expanded ? 'justify-start gap-3' : 'justify-center',
          isActive
            ? 'ndx-nav-active rounded-l-none'
            : 'text-primary/60 hover:text-primary hover:bg-surface-raised/60',
          isFocused && 'ring-2 ring-border-focus',
          'focus-visible:ring-2 focus-visible:ring-border-focus'
        )
      }
    >
      <NavigationIcon destinationId={destination.id} />
      <span className={expanded ? undefined : 'sr-only'}>{destination.label}</span>
    </MotionNavLink>
  )
}
