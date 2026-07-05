import { useNavigate } from 'react-router-dom'
import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../../components/primitives/cn'
import { NavigationIcon } from '../../components/navigation/navigationIcons'
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
        'flex min-h-[var(--ndx-target-min)] w-full flex-col justify-center rounded-md border-l-4 px-3 py-2 text-left text-body text-text-primary transition-colors',
        isFocused
          ? 'border-l-[var(--ndx-accent)] bg-[var(--ndx-workbench-row-selected-bg)]'
          : 'border-l-transparent hover:bg-surface-raised/60'
      )}
    >
      <span className="flex items-center gap-2">
        <NavigationIcon destinationId={destination.id} />
        Open {destination.label}
      </span>
      {subtitle && <span className="text-meta text-text-tertiary">{subtitle}</span>}
    </button>
  )
}
