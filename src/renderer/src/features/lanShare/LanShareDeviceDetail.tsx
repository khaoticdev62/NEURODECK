import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { LanSharePeer, LanShareTrustState } from '@shared/contracts'
import { ControllerButton } from '../../components/primitives/ControllerButton'
import { ErrorState } from '../../components/feedback/UXState'
import { NdxEditorShell, NdxToolWindow } from '../../components/workbench'
import {
  listLanSharePeers,
  removeLanSharePeer,
  setLanSharePeerTrust
} from '../../services/ipc/lanShareClient'

const TRUST_ACTIONS: {
  label: string
  trustState: LanShareTrustState
  variant: 'primary' | 'destructive'
}[] = [
  { label: 'Trust this device', trustState: 'trusted', variant: 'primary' },
  { label: 'Block this device', trustState: 'blocked', variant: 'destructive' }
]

/**
 * ND-LAN-003 Device Detail, folding in ND-LAN-011 Device Trust Review
 * (the trust-transition buttons below call the real spec §12 state
 * machine in `LanSharePeerStore.setTrust` directly — there is no
 * separate review step to build since the state machine itself already
 * enforces "never silently re-trust" and "blocked never auto-reverts").
 */
export function LanShareDeviceDetail(): React.JSX.Element {
  const { peerId } = useParams<{ peerId: string }>()
  const navigate = useNavigate()
  const [peer, setPeer] = useState<LanSharePeer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void listLanSharePeers().then((result) => {
      if (!active) return
      setLoading(false)
      if (!result.ok) {
        setError(result.error.userMessage)
        return
      }
      const found = result.data.find((candidate) => candidate.id === peerId)
      setPeer(found ?? null)
    })
    return () => {
      active = false
    }
  }, [peerId])

  async function handleSetTrust(trustState: LanShareTrustState): Promise<void> {
    if (!peerId) return
    setBusy(true)
    const result = await setLanSharePeerTrust({ id: peerId, trustState })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    setPeer(result.data)
  }

  async function handleRemove(): Promise<void> {
    if (!peerId) return
    setBusy(true)
    const result = await removeLanSharePeer({ id: peerId })
    setBusy(false)
    if (!result.ok) {
      setError(result.error.userMessage)
      return
    }
    navigate('/lan-share/peers')
  }

  if (loading) {
    return <p className="p-4 text-meta text-text-secondary">Loading device…</p>
  }
  if (!peer) {
    return (
      <ErrorState
        title="Device not found"
        description="This device is no longer known — it may have been removed."
        action={
          <ControllerButton variant="secondary" onClick={() => navigate('/lan-share/peers')}>
            Back to Nearby Devices
          </ControllerButton>
        }
      />
    )
  }

  return (
    <div className="grid h-full grid-cols-1 gap-2 overflow-auto docked:min-w-[76rem] docked:grid-cols-[20rem_minmax(40rem,1fr)_18rem]">
      <NdxToolWindow title="Peer Identity" subtitle={peer.status}>
        <div className="space-y-3 text-meta text-text-secondary">
          <p>{peer.addresses[0] ?? 'unknown address'}</p>
          <p>Discovered via {peer.discoverySource}.</p>
        </div>
      </NdxToolWindow>

      <NdxEditorShell title="Device Detail">
        <div className="flex min-h-full min-w-0 flex-col gap-4 p-4">
          <p className="text-title font-semibold text-text-primary">{peer.displayName}</p>
          {error && <ErrorState title="Device action error" description={error} />}

          <section className="flex flex-col gap-1 ndx-settings-section">
            <p className="text-meta text-text-secondary">
              Address {peer.addresses[0] ?? 'unknown'} · transfer port {peer.transferPort} ·
              registration port {peer.authPort}
            </p>
            <p className="text-meta text-text-secondary">
              Status {peer.status} · discovered via {peer.discoverySource} · last seen{' '}
              {new Date(peer.lastSeenAt).toLocaleString()}
            </p>
            <p className="text-meta text-text-secondary">
              Registration v{peer.registrationVersion} · platform {peer.platform} · trust{' '}
              {peer.trustState}
              {peer.groupMatch ? ' · group code matches' : ' · group code not confirmed'}
            </p>
            {peer.fingerprint && (
              <p className="text-meta text-text-tertiary">
                Certificate fingerprint {peer.fingerprint}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-body font-semibold text-text-primary">Trust</p>
            <div className="flex gap-2">
              {TRUST_ACTIONS.map((action) => (
                <ControllerButton
                  key={action.trustState}
                  variant={action.variant}
                  disabled={busy || peer.trustState === action.trustState}
                  onClick={() => void handleSetTrust(action.trustState)}
                >
                  {action.label}
                </ControllerButton>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-body font-semibold text-text-primary">Actions</p>
            <div className="flex gap-2">
              <ControllerButton
                variant="primary"
                disabled={peer.trustState === 'blocked'}
                onClick={() => navigate(`/lan-share/send?peerId=${peer.id}`)}
              >
                Send files to this device
              </ControllerButton>
              <ControllerButton
                variant="destructive"
                disabled={busy}
                onClick={() => void handleRemove()}
              >
                Remove device
              </ControllerButton>
            </div>
          </section>
        </div>
      </NdxEditorShell>

      <NdxToolWindow title="Trust Policy" subtitle={peer.trustState} side="right">
        <div className="space-y-3 text-meta text-text-secondary">
          <p>Trust changes call the real peer trust state machine.</p>
          <p>Blocked devices cannot be selected for send until trust changes.</p>
        </div>
      </NdxToolWindow>
    </div>
  )
}
