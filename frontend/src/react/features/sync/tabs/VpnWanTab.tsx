import { useState } from 'react';
import { Network, Plus, Send, ShieldAlert } from 'lucide-react';
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
      await neurodeckApi.transfer.addManualPeer(host.trim(), Number(port) || 42000, label.trim() || host.trim());
      onPeerAdded();
      setHost('');
      setLabel('');
    } catch (e) {
      onError(`Manual VPN peer add failed: ${e}`);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-1">
      <section aria-label="VPN safety" className="rounded-2xl border border-nd-warning/20 bg-nd-warning/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-nd-warning" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-nd-text">VPN/WAN mode is manual and allowlist-first</h3>
            <p className="mt-1 text-xs leading-5 text-nd-text-muted">
              Public internet exposure is not enabled here. Add peers by VPN or mesh IP, keep strict mode on, and use Diagnostics to verify ports.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Add VPN peer" className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-nd-text-muted">Manual VPN / Mesh Peer</h3>
          <label className="inline-flex items-center gap-2 text-xs text-nd-text-muted">
            <input type="checkbox" checked={strictVpn} onChange={(e) => setStrictVpn(e.target.checked)} />
            Strict VPN-only
          </label>
        </div>
        <div className="grid gap-2 lg:grid-cols-[1fr_100px_1fr_auto]">
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="VPN IP or hostname"
            aria-label="VPN peer host"
            className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
          />
          <input
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="Port"
            aria-label="VPN peer port"
            className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
          />
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Alias"
            aria-label="VPN peer alias"
            className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!host.trim()}
            className="flex items-center justify-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </button>
        </div>
        {strictVpn && (
          <p className="mt-2 text-xs text-nd-text-muted">
            Strict mode records this as a manual peer only; it does not open public inbound listeners or enable mDNS relay.
          </p>
        )}
      </section>

      <section aria-label="Manual VPN peers">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-nd-text-muted">Manual Peers</h3>
        {manualPeers.length === 0 ? (
          <div className="rounded-xl border border-nd-text-muted/10 bg-nd-surface/20 p-4 text-sm text-nd-text-muted">
            <Network className="mb-2 h-5 w-5 text-nd-text-muted" aria-hidden="true" />
            Add a VPN or mesh address to create a send target when mDNS cannot cross the tunnel.
          </div>
        ) : (
          <ul role="list" className="grid gap-2 lg:grid-cols-2">
            {manualPeers.map((peer) => (
              <li key={peer.ip} className="flex items-center gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-4 py-3">
                <Network className="h-4 w-4 shrink-0 text-nd-accent" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-nd-text">{peer.hostname}</p>
                  <p className="text-xs text-nd-text-muted">{peer.ip}:{peer.port}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSendToPeer(peer)}
                  aria-label={`Send file to ${peer.hostname}`}
                  className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-accent/10 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
