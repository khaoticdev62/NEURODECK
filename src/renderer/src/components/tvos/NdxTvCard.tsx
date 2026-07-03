import type { ReactNode } from 'react'
import { NdxFocusSurface } from '../workbench/NdxFocusSurface'
import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../primitives/cn'

export interface NdxTvCardProps {
  id: string
  groupId: string
  title: string
  subtitle?: string
  meta?: ReactNode
  badge?: ReactNode
  icon?: ReactNode
  selected?: boolean
  disabled?: boolean
  priority?: number
  initialFocus?: boolean
  onActivate: () => void
  className?: string
}

/**
 * Full-bleed launcher tile for tvOS-style browsing shelves (Home,
 * Workspace Hub, System Dashboard categories, Apps Library). Registers
 * itself through the same `useFocusable` contract every other focusable
 * element uses — the spatial focus engine already navigates by rect
 * proximity, which is what a row of these needs, so this adds no new
 * focus mechanics, only a consistent tvOS-sized visual treatment on top
 * of the existing `NdxFocusSurface density="spatial"` scale/glow-on-focus
 * behavior (which already respects `prefers-reduced-motion`).
 */
export function NdxTvCard({
  id,
  groupId,
  title,
  subtitle,
  meta,
  badge,
  icon,
  selected = false,
  disabled = false,
  priority,
  initialFocus,
  onActivate,
  className
}: NdxTvCardProps): React.JSX.Element {
  // The spatial focus engine moves real DOM focus to `ref` (`focusElement:
  // () => element.focus()` in useFocusable), so `NdxFocusSurface`'s own
  // `:focus-within` CSS already renders the scale/glow treatment — no need
  // to also thread `isFocused` into `selected`, which would incorrectly
  // conflate "currently focused" with "the selected/active item".
  const { ref } = useFocusable<HTMLButtonElement>({
    id,
    groupId,
    disabled,
    priority,
    initialFocus,
    onActivate
  })

  return (
    <NdxFocusSurface
      density="spatial"
      selected={selected}
      className={cn('ndx-tv-card shrink-0 scroll-ml-2', className)}
    >
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={onActivate}
        className="flex h-full w-full flex-col items-start justify-between gap-2 p-4 text-left"
      >
        <div className="flex w-full items-start justify-between gap-2">
          {icon && (
            <span className="ndx-tv-card-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          {badge}
        </div>
        <div className="w-full">
          <p className="line-clamp-2 text-body font-semibold text-text-primary">{title}</p>
          {subtitle && (
            <p className="line-clamp-2 break-all text-meta text-text-tertiary">{subtitle}</p>
          )}
          {meta}
        </div>
      </button>
    </NdxFocusSurface>
  )
}
