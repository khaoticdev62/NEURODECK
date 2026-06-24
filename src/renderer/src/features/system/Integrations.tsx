import { useEffect, useState } from 'react'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { EmptyState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import { listModelProviders } from '../../services/ipc/modelClient'
import { listRemoteHosts } from '../../services/ipc/remoteClient'

type IntegrationStatus =
  | 'connected'
  | 'disconnected'
  | 'expired'
  | 'permission-changed'
  | 'error'
  | 'unsupported'
  | 'configured'

interface IntegrationItem {
  id: string
  name: string
  category: string
  status: IntegrationStatus
  detail: string
}

interface IntegrationGroup {
  category: string
  items: IntegrationItem[]
}

function statusTone(status: IntegrationStatus): StatusTone {
  switch (status) {
    case 'connected':
    case 'configured':
      return 'success'
    case 'disconnected':
      return 'neutral'
    case 'expired':
    case 'permission-changed':
      return 'warning'
    case 'error':
    case 'unsupported':
      return 'error'
  }
}

function statusLabel(status: IntegrationStatus): string {
  switch (status) {
    case 'connected':
      return 'Connected'
    case 'disconnected':
      return 'Disconnected'
    case 'expired':
      return 'Expired'
    case 'permission-changed':
      return 'Permission changed'
    case 'error':
      return 'Error'
    case 'unsupported':
      return 'Unsupported on current platform'
    case 'configured':
      return 'Configured'
  }
}

const UNSUPPORTED_CATEGORIES = [
  {
    id: 'git-providers',
    name: 'Git providers',
    reason: 'No Git provider account store exists yet.'
  },
  { id: 'cloud-storage', name: 'Cloud storage', reason: 'No cloud-storage adapter exists yet.' },
  {
    id: 'dev-tools',
    name: 'Development tools',
    reason: 'No external dev-tool registry exists yet.'
  },
  { id: 'learning', name: 'Learning platforms', reason: 'No learning-content system exists yet.' },
  {
    id: 'notifications',
    name: 'Notifications',
    reason: 'No notification-provider integration exists yet.'
  },
  {
    id: 'steam-deck',
    name: 'Steam/Deck integrations',
    reason: 'Steam Input and Decky adapter are not implemented yet.'
  }
]

function IntegrationRow({
  item,
  index,
  onActivate
}: {
  item: IntegrationItem
  index: number
  onActivate: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLButtonElement>({
    id: `integration:${item.id}`,
    groupId: 'integrations',
    priority: index === 0 ? 1 : 0,
    initialFocus: index === 0,
    onActivate
  })

  return (
    <ControllerButton
      ref={ref}
      variant="secondary"
      className={`flex items-center justify-between text-left ${isFocused ? 'ring-2 ring-border-focus' : ''}`}
      onClick={onActivate}
    >
      <span className="flex flex-col items-start">
        <span className="text-body font-medium text-text-primary">{item.name}</span>
        <span className="text-meta text-text-secondary">{item.detail}</span>
      </span>
      <StatusBadge tone={statusTone(item.status)} label={statusLabel(item.status)} />
    </ControllerButton>
  )
}

/**
 * ND-048 Integrations. Aggregates real, existing integrations (model providers,
 * remote hosts) and honestly labels categories that have no backend service as
 * unsupported on the current platform rather than faking connected states.
 */
export function Integrations(): React.JSX.Element {
  const [groups, setGroups] = useState<IntegrationGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void Promise.all([listModelProviders(), listRemoteHosts()]).then(
      ([providersResult, hostsResult]) => {
        if (!active) return
        const next: IntegrationGroup[] = []

        const modelItems: IntegrationItem[] = providersResult.ok
          ? providersResult.data.map((provider) => ({
              id: `model:${provider.id}`,
              name: provider.name,
              category: 'Model providers',
              status: provider.enabled ? 'connected' : 'disconnected',
              detail: provider.kind
            }))
          : [
              {
                id: 'model:error',
                name: 'Model providers unavailable',
                category: 'Model providers',
                status: 'error',
                detail: providersResult.error.userMessage
              }
            ]
        if (modelItems.length > 0) {
          next.push({ category: 'Model providers', items: modelItems })
        }

        const remoteItems: IntegrationItem[] = hostsResult.ok
          ? hostsResult.data.map((host) => ({
              id: `remote:${host.id}`,
              name: host.name,
              category: 'Remote systems',
              status: 'configured',
              detail: `${host.hostname}:${host.port}`
            }))
          : [
              {
                id: 'remote:error',
                name: 'Remote systems unavailable',
                category: 'Remote systems',
                status: 'error',
                detail: hostsResult.error.userMessage
              }
            ]
        if (remoteItems.length > 0) {
          next.push({ category: 'Remote systems', items: remoteItems })
        }

        UNSUPPORTED_CATEGORIES.forEach((category) => {
          next.push({
            category: category.name,
            items: [
              {
                id: `unsupported:${category.id}`,
                name: category.name,
                category: category.name,
                status: 'unsupported',
                detail: category.reason
              }
            ]
          })
        })

        setGroups(next)
        setLoading(false)
      }
    )
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-meta text-text-secondary">Loading integrations…</p>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <EmptyState
          title="No integrations"
          description="Integrations will appear here once their backend services are built."
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <header>
        <p className="text-title font-semibold text-text-primary">Integrations</p>
        <p className="text-body text-text-secondary">
          Real integrations are shown as-is; unsupported categories are labeled honestly.
        </p>
      </header>

      {groups.map((group, groupIndex) => (
        <section key={group.category}>
          <p className="mb-1 text-meta font-semibold text-text-primary">{group.category}</p>
          <div className="flex flex-col gap-1">
            {group.items.map((item, index) => (
              <IntegrationRow
                key={item.id}
                item={item}
                index={groupIndex === 0 ? index : -1}
                onActivate={() => undefined}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
