import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../primitives/cn'

export interface NdxTvTab {
  id: string
  label: string
}

export interface NdxTvTabBarProps {
  groupId: string
  tabs: NdxTvTab[]
  activeId: string
  onSelect: (id: string) => void
}

function Tab({
  tab,
  groupId,
  active,
  priority,
  onSelect
}: {
  tab: NdxTvTab
  groupId: string
  active: boolean
  priority: number
  onSelect: (id: string) => void
}): React.JSX.Element {
  const { ref } = useFocusable<HTMLButtonElement>({
    id: `${groupId}:tab:${tab.id}`,
    groupId,
    priority,
    onActivate: () => onSelect(tab.id)
  })

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onSelect(tab.id)}
      className={cn(
        'ndx-tv-tab min-h-[var(--ndx-target-min)] px-4 text-body font-medium transition-colors',
        active
          ? 'text-text-primary ndx-tv-tab-active'
          : 'text-text-tertiary hover:text-text-secondary'
      )}
    >
      {tab.label}
    </button>
  )
}

/**
 * tvOS-style segmented top tab bar for in-page sectioning (e.g. the Apps
 * Library's "Registered Apps" / "Steam Shortcuts" split). Deliberately not
 * a replacement for `ShellLayout`'s primary tool window — that's shared
 * chrome every route renders through, and swapping it per-route is a
 * separate, larger architectural change than this visual pass covers.
 */
export function NdxTvTabBar({
  groupId,
  tabs,
  activeId,
  onSelect
}: NdxTvTabBarProps): React.JSX.Element {
  return (
    <div role="tablist" className="flex items-center gap-1 border-b border-border">
      {tabs.map((tab, index) => (
        <Tab
          key={tab.id}
          tab={tab}
          groupId={groupId}
          active={tab.id === activeId}
          priority={tabs.length - index}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
