import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RemoteHost, RemoteHostAuthMethod } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import { cn } from '../../components/primitives/cn'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import {
  addRemoteHost,
  listRemoteHosts,
  removeRemoteHost,
  testRemoteHostConnection
} from '../../services/ipc/remoteClient'

/**
 * ND-040 Remote Systems, scoped to SSH hosts — the wireframe also lists
 * homelab devices, Windows remote tooling, containers/VMs, and network
 * shares as targets, but those each need their own protocol integration
 * this slice doesn't build; adding one means adding a `kind` to the
 * contract and a matching connection strategy, not reshaping this screen.
 * Host cards' "Active tasks" is honestly omitted — there is no concept of
 * a background remote task yet, only an interactive session (ND-041).
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

  return (
    <div className="grid h-full min-w-[58rem] grid-cols-[22rem_minmax(30rem,1fr)] gap-2 overflow-auto">
      <NdxToolWindow title="Remote Hosts" subtitle="SSH targets">
        <ControllerButton variant="primary" onClick={() => setShowAddForm((current) => !current)}>
          {showAddForm ? 'Cancel' : 'Add host'}
        </ControllerButton>
        {error && <ErrorState title="Remote systems error" description={error} />}

        {loading ? (
          <p className="text-meta text-text-secondary">Loading hosts…</p>
        ) : hosts.length === 0 ? (
          <EmptyState
            className="flex-1"
            title="No remote hosts"
            description="Add an SSH host to connect a terminal session to it."
          />
        ) : (
          <ul className="flex flex-col gap-2 overflow-auto">
            {hosts.map((host) => (
              <HostCard
                key={host.id}
                host={host}
                onOpen={() => navigate(`/remote/${host.id}`)}
                onRemove={() => void handleRemove(host.id)}
              />
            ))}
          </ul>
        )}
      </NdxToolWindow>
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
    <div className="flex flex-col gap-2 border border-border bg-surface p-3">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Host label (e.g. Homelab server)"
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      />
      <div className="flex gap-2">
        <input
          value={hostname}
          onChange={(event) => setHostname(event.target.value)}
          placeholder="Hostname or IP"
          className="flex-1 rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
        />
        <input
          value={port}
          onChange={(event) => setPort(event.target.value)}
          placeholder="Port"
          inputMode="numeric"
          className="w-20 rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
        />
      </div>
      <input
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Username"
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      />
      <select
        value={authMethod}
        onChange={(event) => setAuthMethod(event.target.value as RemoteHostAuthMethod)}
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      >
        <option value="password">Password</option>
        <option value="privateKey">Private key</option>
      </select>
      {authMethod === 'privateKey' && (
        <input
          value={privateKeyPath}
          onChange={(event) => setPrivateKeyPath(event.target.value)}
          placeholder="Private key file path"
          className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
        />
      )}
      <input
        value={secret}
        onChange={(event) => setSecret(event.target.value)}
        placeholder={
          authMethod === 'password' ? 'Password (stored encrypted)' : 'Key passphrase, if any'
        }
        type="password"
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      />
      <p className="text-meta text-text-tertiary">
        The host key is trusted on first connection and verified on every connection after that — if
        it ever changes, the connection is rejected rather than silently re-trusted.
      </p>
      <ControllerButton
        variant="primary"
        disabled={saving || !hostname.trim() || !username.trim()}
        onClick={() => void handleAdd()}
      >
        {saving ? 'Adding…' : 'Add host'}
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
      `Reachable · ${result.data.latencyMs}ms${result.data.newlyTrusted ? ' · host key trusted' : ''}`
    )
  }

  return (
    <li
      ref={ref}
      tabIndex={-1}
      className={cn(
        'rounded-sm border bg-canvas p-3',
        isFocused
          ? 'border-[var(--ndx-workbench-active-pane-border)] bg-[var(--ndx-workbench-selected-row-bg)]'
          : 'border-border'
      )}
    >
      <p className="text-body font-semibold text-text-primary">{host.name}</p>
      <p className="text-meta text-text-secondary">
        {host.username}@{host.hostname}:{host.port} ·{' '}
        {host.authMethod === 'password' ? 'Password' : 'Private key'}
        {host.trustedFingerprint ? ' · Host key trusted' : ' · Not yet connected'}
      </p>
      {testResult && <p className="text-meta text-text-tertiary">{testResult}</p>}
      <div className="mt-2 flex gap-2">
        <ControllerButton variant="primary" disabled={testing} onClick={() => void handleTest()}>
          {testing ? 'Testing…' : 'Test connection'}
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
