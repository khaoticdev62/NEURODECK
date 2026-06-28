import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LanSharePeer } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { EmptyState, ErrorState } from '../../components/feedback/UXState'
import { useFocusable } from '../../controller/focus/useFocusable'
import { addManualLanSharePeer, listLanSharePeers } from '../../services/ipc/lanShareClient'

/**
 * ND-LAN-002 Nearby Devices, folding in ND-LAN-010 Trusted Devices (trust
 * state is shown per-card rather than a separate filtered screen) and
 * ND-LAN-013 Manual Connection (the add-peer form below performs a real
 * v1 registration probe against the entered address via
 * `LanShareService.probeManualPeer`, not a fabricated "added" state).
 */
export function LanShareNearbyDevices(): React.JSX.Element {
  const navigate = useNavigate()
  const [peers, setPeers] = useState<LanSharePeer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  async function refresh(): Promise<void> {
    const result = await listLanSharePeers()
    if (result.ok) {
      setPeers(result.data)
      setError(null)
    } else {
      setError(result.error.userMessage)
    }
  }

  useEffect(() => {
    let active = true
    void listLanSharePeers().then((result) => {
      if (!active) return
      setLoading(false)
      if (result.ok) {
        setPeers(result.data)
      } else {
        setError(result.error.userMessage)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-title font-semibold text-text-primary">Nearby Devices</p>
        <div className="flex gap-2">
          <ControllerButton variant="ghost" onClick={() => void refresh()}>
            Refresh
          </ControllerButton>
          <ControllerButton variant="primary" onClick={() => setShowAddForm((current) => !current)}>
            {showAddForm ? 'Cancel' : 'Add manually'}
          </ControllerButton>
        </div>
      </div>

      {error && <ErrorState title="Nearby devices error" description={error} />}

      {showAddForm && (
        <AddPeerForm
          onAdded={() => {
            setShowAddForm(false)
            void refresh()
          }}
          onError={setError}
        />
      )}

      {loading ? (
        <p className="text-meta text-text-secondary">Discovering devices…</p>
      ) : peers.length === 0 ? (
        <EmptyState
          className="flex-1"
          title="No devices found yet"
          description="Devices on the same network running a Warpinator-compatible service will appear here automatically, or add one manually by address."
        />
      ) : (
        <ul className="flex flex-col gap-2 overflow-auto">
          {peers.map((peer) => (
            <PeerCard
              key={peer.id}
              peer={peer}
              onOpen={() => navigate(`/lan-share/peers/${peer.id}`)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function AddPeerForm({
  onAdded,
  onError
}: {
  onAdded: () => void
  onError: (message: string | null) => void
}): React.JSX.Element {
  const [address, setAddress] = useState('')
  const [transferPort, setTransferPort] = useState('42000')
  const [authPort, setAuthPort] = useState('42001')
  const [saving, setSaving] = useState(false)

  async function handleAdd(): Promise<void> {
    setSaving(true)
    const result = await addManualLanSharePeer({
      address: address.trim(),
      transferPort: Number(transferPort) || 42000,
      authPort: Number(authPort) || 42001
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
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="IP address or hostname"
        className="rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
      />
      <div className="flex gap-2">
        <input
          value={transferPort}
          onChange={(event) => setTransferPort(event.target.value)}
          placeholder="Transfer port"
          inputMode="numeric"
          className="flex-1 rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
        />
        <input
          value={authPort}
          onChange={(event) => setAuthPort(event.target.value)}
          placeholder="Registration port"
          inputMode="numeric"
          className="flex-1 rounded-md border border-border bg-canvas p-2 text-body text-text-primary"
        />
      </div>
      <p className="text-meta text-text-tertiary">
        A real registration handshake is attempted against this address immediately — it will show
        as &ldquo;incompatible&rdquo; here if nothing answers, never as a fabricated success.
      </p>
      <ControllerButton
        variant="primary"
        disabled={saving || !address.trim()}
        onClick={() => void handleAdd()}
      >
        {saving ? 'Connecting…' : 'Add device'}
      </ControllerButton>
    </div>
  )
}

function PeerCard({ peer, onOpen }: { peer: LanSharePeer; onOpen: () => void }): React.JSX.Element {
  const { ref, isFocused } = useFocusable<HTMLLIElement>({
    id: `lan-share-peer:${peer.id}`,
    groupId: 'lan-share-peers',
    onActivate: onOpen
  })

  return (
    <li
      ref={ref}
      tabIndex={-1}
      className={`border p-3 ${isFocused ? 'border-border-focus' : 'border-border'} bg-surface`}
    >
      <p className="text-body font-semibold text-text-primary">{peer.displayName}</p>
      <p className="text-meta text-text-secondary">
        {peer.addresses[0] ?? 'unknown address'} · {peer.status} · trust: {peer.trustState}
        {peer.groupMatch ? ' · group matches' : ''}
      </p>
      <p className="text-meta text-text-tertiary">
        {peer.discoverySource} · registration v{peer.registrationVersion} · platform {peer.platform}
      </p>
      <div className="mt-2 flex gap-2">
        <ControllerButton variant="secondary" onClick={onOpen}>
          View device
        </ControllerButton>
      </div>
    </li>
  )
}
