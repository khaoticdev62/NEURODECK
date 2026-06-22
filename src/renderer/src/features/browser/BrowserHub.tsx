import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BrowserTab } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import {
  createBrowserTab,
  listBrowserTabs,
  removeBrowserTab
} from '../../services/ipc/browserClient'
import { useWorkspaces } from '../workspaces/useWorkspaces'

const START_PAGE = 'https://www.google.com'

/**
 * ND-030 Browser Hub. Real: tabs are persisted `BrowserTab` records
 * (`core/browser/BrowserTabStore.ts`), scoped to the active workspace.
 * Opening a tab navigates to ND-031, which attaches the real
 * `WebContentsView` this hub never touches directly.
 */
export function BrowserHub(): React.JSX.Element {
  const { activeWorkspace } = useWorkspaces()

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="No active workspace"
        description="Open a workspace to use its browser tabs."
      />
    )
  }

  return <BrowserHubWorkspace key={activeWorkspace.id} workspaceId={activeWorkspace.id} />
}

function BrowserHubWorkspace({ workspaceId }: { workspaceId: string }): React.JSX.Element {
  const navigate = useNavigate()
  const [tabs, setTabs] = useState<BrowserTab[]>([])
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let active = true
    void listBrowserTabs({ workspaceId }).then((result) => {
      if (!active) return
      if (result.ok) {
        setTabs(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [workspaceId])

  async function handleNewTab(): Promise<void> {
    setCreating(true)
    const result = await createBrowserTab({ workspaceId, url: START_PAGE })
    setCreating(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    navigate(`/browser/${result.data.id}`)
  }

  async function handleRemove(tabId: string): Promise<void> {
    const result = await removeBrowserTab({ tabId })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setTabs((current) => current.filter((tab) => tab.id !== tabId))
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-title font-semibold text-text-primary">Browser Hub</p>
        <ControllerButton variant="primary" disabled={creating} onClick={() => void handleNewTab()}>
          {creating ? 'Opening…' : 'New tab'}
        </ControllerButton>
      </div>

      {error && <ErrorState title="Browser error" description={error} />}

      {tabs.length === 0 ? (
        <EmptyState
          className="flex-1"
          title="No tabs open"
          description="Open a new tab to start browsing."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {tabs.map((tab) => (
            <BrowserTabCard
              key={tab.id}
              tab={tab}
              onOpen={() => navigate(`/browser/${tab.id}`)}
              onRemove={() => void handleRemove(tab.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function BrowserTabCard({
  tab,
  onOpen,
  onRemove
}: {
  tab: BrowserTab
  onOpen: () => void
  onRemove: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLLIElement>({
    id: `browser-tab:${tab.id}`,
    groupId: 'browser-hub',
    onActivate: onOpen
  })

  return (
    <li
      ref={ref}
      tabIndex={-1}
      className={`rounded-lg border p-4 ${isFocused ? 'border-border-focus' : 'border-border'} bg-surface`}
    >
      <p className="text-body font-semibold text-text-primary">{tab.title || tab.url}</p>
      <p className="text-meta text-text-secondary">{tab.url}</p>
      <p className="text-meta text-text-tertiary">{tab.loading ? 'Loading…' : 'Idle'}</p>
      <div className="mt-3 flex gap-2">
        <ControllerButton variant="primary" onClick={onOpen}>
          Open
        </ControllerButton>
        <ControllerButton variant="ghost" onClick={onRemove}>
          Close
        </ControllerButton>
      </div>
    </li>
  )
}
