import { useState } from 'react';
import { Network, Plus, Send, ShieldAlert } from 'lucide-react';
import { Button } from '../../../components/primitives/Button';
import { IconButton } from '../../../components/primitives/IconButton';
import { Panel } from '../../../components/primitives/Panel';
import { TextInput } from '../../../components/primitives/TextInput';
import { Toggle } from '../../../components/primitives/Toggle';
import { EmptyState } from '../../../components/primitives/EmptyState';
import { neurodeckApi } from '../../../services/bridgeAdapter';
import type { TransferPeer } from '../../../services/bridgeAdapter';

interface Props {
  peers: TransferPeer[];
  onSendToPeer: (peer: TransferPeer) => void;
  onError: (msg: string) => void;
  onPeerAdded: () => void;
}

export function VpnWanTab({ peers, onSendToPeer, onError, onPeerAdded }: Props) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('42000');
  const [label, setLabel] = useState('');
  const [strictVpn, setStrictVpn] = useState(true);
  const manualPeers = peers.filter((peer) => peer.os === 'unknown' || peer.hostname.toLowerCase().includes('vpn'));

  const handleAdd = async () => {
    if (!host.trim()) return;
    try {
      await neurodeckApi.transfer.addManualPeer(
        host.trim(),
        Number(port) || 42000,
        label.trim() || host.trim()
      );
      onPeerAdded();
      setHost('');
      setLabel('');
    } catch (e) {
      onError(`Manual VPN peer add failed: ${e}`);
    }
  };

  return (
    <Panel eyebrow="VPN / WAN" title="Manual & VPN Peers" className="h-full">
      <div className="flex h-full flex-col gap-4 overflow-y-auto">
        <section aria-label="VPN safety" className="rounded-xl border border-nd-accent-warning/25 bg-nd-accent-warning/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-accent-warning/20 bg-nd-accent-warning/10">
              <ShieldAlert className="h-4 w-4 text-nd-accent-warning" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-nd-text-primary">VPN/WAN mode is manual and allowlist-first</h3>
              <p className="mt-1 text-xs leading-5 text-nd-text-muted">
                Public internet exposure is not enabled here. Add peers by VPN or mesh IP, keep strict mode on, and use Diagnostics to verify ports.
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Add VPN peer" className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
              Manual VPN / Mesh Peer
            </h3>
            <Toggle
              checked={strictVpn}
              onChange={() => setStrictVpn((v) => !v)}
              label="Strict VPN-only"
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_100px_1fr_auto] lg:items-end">
            <TextInput
              label="Host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="VPN IP or hostname"
              fullWidth
            />
            <TextInput
              label="Port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="42000"
              fullWidth
            />
            <TextInput
              label="Alias"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional"
              fullWidth
            />
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={Plus}
              disabled={!host.trim()}
              onClick={() => void handleAdd()}
            >
              Add
            </Button>
          </div>
          {strictVpn && (
            <p className="mt-2 text-xs text-nd-text-muted">
              Strict mode records this as a manual peer only; it does not open public inbound listeners or enable mDNS relay.
            </p>
          )}
        </section>

        <section aria-label="Manual VPN peers" className="min-h-0 flex-1">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
            Manual Peers
          </h3>
          {manualPeers.length === 0 ? (
            <EmptyState
              icon={Network}
              title="No manual peers"
              description="Add a VPN or mesh address to create a send target when mDNS cannot cross the tunnel."
              compact
            />
          ) : (
            <ul role="list" className="grid gap-2 lg:grid-cols-2">
              {manualPeers.map((peer) => (
                <li
                  key={peer.ip}
                  className="flex items-center gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-4 py-3 transition-colors duration-fast hover:border-nd-accent-primary/25"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/60">
                    <Network className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-nd-text-primary">{peer.hostname}</p>
                    <p className="text-xs text-nd-text-muted">{peer.ip}:{peer.port}</p>
                  </div>
                  <IconButton
                    type="button"
                    size="md"
                    variant="accent"
                    aria-label={`Send file to ${peer.hostname}`}
                    onClick={() => onSendToPeer(peer)}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Panel>
  );
}
