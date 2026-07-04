import type { LucideIcon } from 'lucide-react'

/**
 * Builds an `{ id } -> icon` renderer over a lookup map with a safe fallback
 * for unknown ids — shared by navigationIcons.tsx and tvCategoryIcons.tsx so
 * the map/fallback/render boilerplate isn't hand-copied per icon set.
 * strokeWidth is fixed at 1.75 (rather than lucide-react's default of 2) to
 * match this project's established icon weight convention.
 */
export function createIconLookup(
  map: Record<string, LucideIcon>,
  fallback: LucideIcon,
  className: string
): (props: { id: string }) => React.JSX.Element {
  return function LookupIcon({ id }: { id: string }): React.JSX.Element {
    const Icon = map[id] ?? fallback
    return <Icon aria-hidden strokeWidth={1.75} className={className} />
  }
}
