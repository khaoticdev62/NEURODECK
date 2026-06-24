import { useNavigate } from 'react-router-dom'
import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../../components/primitives/cn'
import type { NavigationDestination } from '../../components/navigation/navigationDestinations'

export interface CommandPaletteResultRowProps {
  destination: NavigationDestination
  priority: number
  subtitle?: string
  onBeforeRun?: () => void
  onRun: () => void
}

export function CommandPaletteResultRow({
  destination,
  priority,
  subtitle,
  onBeforeRun,
  onRun
}: CommandPaletteResultRowProps): React.JSX.Element {
  const navigate = useNavigate()
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `command:${destination.id}`,
    groupId: 'command-palette',
    priority,
    onActivate: () => {
      onBeforeRun?.()
      navigate(destination.path)
      onRun()
    }
  })

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        onBeforeRun?.()
        navigate(destination.path)
        onRun()
      }}
      className={cn(
        'flex w-full min-h-[var(--ndx-target-min)] flex-col justify-center rounded-md px-3 py-2 text-left text-body text-text-primary',
        isFocused ? 'bg-surface-raised' : 'hover:bg-surface-raised/60'
      )}
    >
      <span>Open {destination.label}</span>
      {subtitle && <span className="text-meta text-text-tertiary">{subtitle}</span>}
    </button>
  )
}
