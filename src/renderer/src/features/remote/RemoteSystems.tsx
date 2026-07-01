import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RemoteHost, RemoteHostAuthMethod } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../../components/primitives/cn'
import { NdxDeckLayout, NdxEditorShell } from '../../components/workbench'
import {
  addRemoteHost,
  listRemoteHosts,
  removeRemoteHost,
  testRemoteHostConnection
} from '../../services/ipc/remoteClient'

/**
 * ND-040 Remote Systems, scoped to SSH hosts. The Deck layout keeps host
 * management in the main surface at 1280x800 and promotes the host list to a
 * docked rail only on wide displays.
 */
export function RemoteSystems(): React.JSX.Element {
  const navigate = useNavigate()
  const [hosts, setHosts] = useState<RemoteHost[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void listRemoteHosts().then((result) => {
      if (!active) return
      setLoading(false)
      if (result.ok) {
        setHosts(result.data)
        setError(null)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [])

  async function refresh(): Promise<void> {
    const result = await listRemoteHosts()
    if (result.ok) setHosts(result.data)
  }

  async function handleRemove(hostId: string): Promise<void> {
    const result = await removeRemoteHost({ hostId })
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setHosts((current) => current.filter((host) => host.id !== hostId))
  }

  const hostList = (
    <HostList
      hosts={hosts}
      error={error}
      loading={loading}
      showAddForm={showAddForm}
      onToggleAdd={() => setShowAddForm((current) => !current)}
      onOpen={(host) => navigate(`/remote/${host.id}`)}
      onRemove={(host) => void handleRemove(host.id)}
    />
  )

  return (
    <NdxDeckLayout>
      <div className="grid h-full min-h-0 min-w-0 grid-cols-1 gap-2 overflow-hidden docked:grid-cols-[22rem_minmax(0,1fr)]">
        <section className="ndx-workbench-surface min-h-0 overflow-hidden p-3">{hostList}</section>
        <NdxEditorShell title={showAddForm ? 'Add SSH Host' : 'Remote Session Launcher'}>
          {showAddForm ? (
            <div className="p-3">
              <AddHostForm
                onAdded={() => {
                  setShowAddForm(false)
                  void refresh()
                }}
                onError={setError}
              />
            </div>
          ) : (
            <EmptyState
              className="h-full"
              title="Select a remote host"
              description="Open a host to start a remote terminal session."
            />
          )}
        </NdxEditorShell>
      </div>
    </NdxDeckLayout>
  )
}

function HostList({
  hosts,
  error,
  loading,
  showAddForm,
  onToggleAdd,
  onOpen,
  onRemove
}: {
  hosts: RemoteHost[]
  error: string | null
  loading: boolean
  showAddForm: boolean
  onToggleAdd: () => void
  onOpen: (host: RemoteHost) => void
  onRemove: (host: RemoteHost) => void
}): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ControllerButton variant="primary" onClick={onToggleAdd}>
        {showAddForm ? 'Cancel' : 'Add host'}
      </ControllerButton>
      {error && <ErrorState title="Remote systems error" description={error} />}

      {loading ? (
        <p className="text-meta text-text-secondary">Loading hosts...</p>
      ) : hosts.length === 0 ? (
        <EmptyState
          className="flex-1"
          title="No remote hosts"
          description="Add an SSH host to connect a terminal session to it."
        />
      ) : (
        <ul className="flex min-h-0 flex-col gap-2 overflow-auto">
          {hosts.map((host) => (
            <HostCard
              key={host.id}
              host={host}
              onOpen={() => onOpen(host)}
              onRemove={() => onRemove(host)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function AddHostForm({
  onAdded,
  onError
}: {
  onAdded: () => void
  onError: (message: string | null) => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [hostname, setHostname] = useState('')
  const [port, setPort] = useState('22')
  const [username, setUsername] = useState('')
  const [authMethod, setAuthMethod] = useState<RemoteHostAuthMethod>('password')
  const [secret, setSecret] = useState('')
  const [privateKeyPath, setPrivateKeyPath] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(): Promise<void> {
    setSaving(true)
    const result = await addRemoteHost({
      name: name.trim() || hostname.trim(),
      hostname: hostname.trim(),
      port: Number(port) || 22,
      username: username.trim(),
      authMethod,
      secret: secret.trim() || undefined,
      privateKeyPath: authMethod === 'privateKey' ? privateKeyPath.trim() || undefined : undefined
    })
    setSaving(false)
    if (!result.ok) {
      onError(result.error.userMessage)
      return
    }
    onError(null)
    onAdded()
  }

  return (
    <div className="ndx-workbench-surface flex flex-col gap-2 p-3">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Host label (e.g. Homelab server)"
        className="ndx-input px-3 text-body"
      />
      <div className="grid grid-cols-1 gap-2 deck:grid-cols-[minmax(0,1fr)_6rem]">
        <input
          value={hostname}
          onChange={(event) => setHostname(event.target.value)}
          placeholder="Hostname or IP"
          className="ndx-input px-3 text-body"
        />
        <input
          value={port}
          onChange={(event) => setPort(event.target.value)}
          placeholder="Port"
          inputMode="numeric"
          className="ndx-input px-3 text-body"
        />
      </div>
      <input
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Username"
        className="ndx-input px-3 text-body"
      />
      <select
        value={authMethod}
        onChange={(event) => setAuthMethod(event.target.value as RemoteHostAuthMethod)}
        className="ndx-input px-3 text-body"
      >
        <option value="password">Password</option>
        <option value="privateKey">Private key</option>
      </select>
      {authMethod === 'privateKey' && (
        <input
          value={privateKeyPath}
          onChange={(event) => setPrivateKeyPath(event.target.value)}
          placeholder="Private key file path"
          className="ndx-input px-3 text-body"
        />
      )}
      <input
        value={secret}
        onChange={(event) => setSecret(event.target.value)}
        placeholder={
          authMethod === 'password' ? 'Password (stored encrypted)' : 'Key passphrase, if any'
        }
        type="password"
        className="ndx-input px-3 text-body"
      />
      <p className="text-meta text-text-tertiary">
        The host key is trusted on first connection and verified on every connection after that.
      </p>
      <ControllerButton
        variant="primary"
        disabled={saving || !hostname.trim() || !username.trim()}
        onClick={() => void handleAdd()}
      >
        {saving ? 'Adding...' : 'Add host'}
      </ControllerButton>
    </div>
  )
}

function HostCard({
  host,
  onOpen,
  onRemove
}: {
  host: RemoteHost
  onOpen: () => void
  onRemove: () => void
}): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLLIElement>({
    id: `remote-host:${host.id}`,
    groupId: 'remote-systems',
    onActivate: onOpen
  })
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  async function handleTest(): Promise<void> {
    setTesting(true)
    const result = await testRemoteHostConnection({ hostId: host.id })
    setTesting(false)
    if (!result.ok) {
      setTestResult(result.error.userMessage)
      return
    }
    if (!result.data.reachable) {
      setTestResult(result.data.errorMessage ?? 'Could not reach this host.')
      return
    }
    setTestResult(
      `Reachable - ${result.data.latencyMs}ms${result.data.newlyTrusted ? ' - host key trusted' : ''}`
    )
  }

  return (
    <li
      ref={ref}
      tabIndex={-1}
      data-selected={isFocused}
      className={cn('ndx-workbench-row bg-[var(--ndx-workbench-panel-bg)] p-3')}
    >
      <p className="text-body font-semibold text-text-primary">{host.name}</p>
      <p className="text-meta text-text-secondary">
        {host.username}@{host.hostname}:{host.port} -{' '}
        {host.authMethod === 'password' ? 'Password' : 'Private key'}
        {host.trustedFingerprint ? ' - Host key trusted' : ' - Not yet connected'}
      </p>
      {testResult && <p className="text-meta text-text-tertiary">{testResult}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <ControllerButton variant="primary" disabled={testing} onClick={() => void handleTest()}>
          {testing ? 'Testing...' : 'Test connection'}
        </ControllerButton>
        <ControllerButton variant="secondary" onClick={onOpen}>
          Open session
        </ControllerButton>
        <ControllerButton variant="ghost" onClick={onRemove}>
          Remove
        </ControllerButton>
      </div>
    </li>
  )
}
