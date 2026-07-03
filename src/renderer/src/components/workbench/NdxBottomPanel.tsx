import { useState } from 'react'
import { ControllerButton } from '../primitives/ControllerButton'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'

const PANEL_TABS = ['Problems', 'Terminal', 'Output', 'Tasks', 'Agents']

export function NdxBottomPanel(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(PANEL_TABS[0])
  const bottomContent = useWorkbenchStore((state) => state.bottomContent)

  return (
    <section
      aria-label="Bottom Tool Window"
      className="border-t border-[var(--ndx-workbench-border)] bg-[var(--ndx-workbench-panel-bg)]"
    >
      <div className="flex h-8 items-center justify-between px-2">
        <div className="flex min-w-0 items-center gap-1">
          {PANEL_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`h-6 px-2 text-meta ${
                activeTab === tab
                  ? 'bg-surface-raised text-text-primary'
                  : 'text-text-secondary hover:bg-surface-raised'
              }`}
              onClick={() => {
                setActiveTab(tab)
                setOpen(true)
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <ControllerButton
          variant="ghost"
          className="h-6 min-h-0 px-2 text-meta"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? 'Close Panel' : 'Open Panel'}
        </ControllerButton>
      </div>
      {open && (
        <div className="h-[var(--ndx-workbench-bottom-panel-height)] border-t border-[var(--ndx-workbench-border)] p-3 text-meta text-text-secondary overflow-auto">
          {bottomContent ?? `No active ${activeTab.toLowerCase()} items.`}
        </div>
      )}
    </section>
  )
}
