import { useNavigate } from 'react-router-dom'
import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../../components/primitives/cn'
import type { NavigationDestination } from '../../components/navigation/navigationDestinations'

export interface CommandPaletteResultRowProps {
  destination: NavigationDestination
  priority: number
  onRun: () => void
}

export function CommandPaletteResultRow({
  destination,
  priority,
  onRun
}: CommandPaletteResultRowProps): React.JSX.Element {
  const navigate = useNavigate()
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `command:${destination.id}`,
    groupId: 'command-palette',
    priority,
    onActivate: () => {
      navigate(destination.path)
      onRun()
    }
  })

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        navigate(destination.path)
        onRun()
      }}
      className={cn(
        'flex w-full min-h-[var(--ndx-target-min)] items-center rounded-md px-3 text-left text-body text-text-primary',
        isFocused ? 'bg-surface-raised' : 'hover:bg-surface-raised/60'
      )}
    >
      Open {destination.label}
    </button>
  )
}
