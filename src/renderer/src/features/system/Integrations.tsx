import { useEffect, useState } from 'react'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { StatusBadge, type StatusTone } from '../../components/primitives/StatusBadge'
import { EmptyState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import { useFocusable } from '../../controller/focus/useFocusable'
import { getDeckyStatus, setDeckySettings } from '../../services/ipc/deckyClient'
import { listModelProviders } from '../../services/ipc/modelClient'
import { listRemoteHosts } from '../../services/ipc/remoteClient'
import { useWorkbenchStore } from '../../state/useWorkbenchStore'

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
    id: 'steam-input',
    name: 'Steam Input (rear buttons)',
    reason: 'No native Steam Deck input driver is implemented yet — a documented platform gap.'
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
  const [deckyEnabled, setDeckyEnabled] = useState(false)
  const [deckyListening, setDeckyListening] = useState(false)
  const [deckyBusy, setDeckyBusy] = useState(false)

  async function refreshDeckyStatus(): Promise<void> {
    const result = await getDeckyStatus()
    if (result.ok) {
      setDeckyEnabled(result.data.enabled)
      setDeckyListening(result.data.listening)
    }
  }

  async function handleToggleDecky(): Promise<void> {
    setDeckyBusy(true)
    const result = await setDeckySettings({ enabled: !deckyEnabled })
    setDeckyBusy(false)
    if (result.ok) {
      setDeckyEnabled(result.data.enabled)
      await refreshDeckyStatus()
    }
  }

  useEffect(() => {
    let active = true
    void getDeckyStatus().then((result) => {
      if (!active || !result.ok) return
      setDeckyEnabled(result.data.enabled)
      setDeckyListening(result.data.listening)
    })
    return () => {
      active = false
    }
  }, [])

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

  const setPrimary = useWorkbenchStore((state) => state.setPrimary)
  const setSecondary = useWorkbenchStore((state) => state.setSecondary)

  useEffect(() => {
    setPrimary('Integration Groups', `${groups.length} groups`, (
      <NdxToolWindow title="Integration Groups" subtitle={`${groups.length} groups`}>
        <p className="text-meta text-text-secondary">
          Model providers and remote systems are backed by real services. Unsupported categories are
          explicit.
        </p>
        <div className="border-t border-border pt-3">
          <p className="text-meta font-semibold text-text-primary">Focus source</p>
          <p className="text-meta text-text-tertiary">
            The first real integration row keeps the existing controller initial-focus behavior.
          </p>
        </div>
      </NdxToolWindow>
    ))
    return () => setPrimary('Command Deck', undefined, null)
  }, [groups.length, setPrimary])

  useEffect(() => {
    setSecondary(
      <NdxToolWindow title="Integration Scope" subtitle="Local only" side="right">
        <div>
          <p className="text-meta font-semibold text-text-primary">Data policy</p>
          <p className="text-meta text-text-tertiary">
            Integrations run entirely locally unless explicit opt-in happens.
          </p>
        </div>
      </NdxToolWindow>
    )
    return () => setSecondary(null)
  }, [setSecondary])

  useEffect(() => {
    setSecondary(
      <NdxToolWindow title="Integration Scope" subtitle="No fake state" side="right">
        <div>
          <p className="text-meta font-semibold text-text-primary">Status policy</p>
          <p className="text-meta text-text-tertiary">
            Categories without backend services are marked unsupported instead of simulated.
          </p>
        </div>
      </NdxToolWindow>
    )
    return () => setSecondary(null)
  }, [setSecondary])

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
    <div className="h-full flex-1">
      <NdxEditorShell title="Integration Inventory">
        <div className="flex min-h-full flex-col gap-4 p-4">
          <header>
            <p className="text-title font-semibold text-text-primary">Integrations</p>
            <p className="text-body text-text-secondary">
              Real integrations are shown as-is; unsupported categories are labeled honestly.
            </p>
          </header>

          <section>
            <p className="mb-1 text-meta font-semibold text-text-primary">
              Steam/Deck integrations
            </p>
            <div className="flex flex-col gap-1">
              <IntegrationRow
                item={{
                  id: 'decky-bridge',
                  name: deckyBusy
                    ? 'Decky Loader bridge (working...)'
                    : 'Decky Loader bridge — activate to toggle',
                  category: 'Steam/Deck integrations',
                  status: deckyEnabled ? (deckyListening ? 'connected' : 'error') : 'disconnected',
                  detail: deckyEnabled
                    ? deckyListening
                      ? 'Loopback bridge is listening for the separate Decky plugin.'
                      : 'Enabled, but the loopback listener failed to start — check logs.'
                    : 'Off by default. Activate to start the real, loopback-only, token-authenticated bridge a separate Decky Loader plugin can call into.'
                }}
                index={1}
                onActivate={() => void handleToggleDecky()}
              />
            </div>
          </section>

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
      </NdxEditorShell>
    </div>
  )
}
