import { useState } from 'react';
import { Send, Laptop, Trash2, Plus, Monitor } from 'lucide-react';
import { EmptyState } from '../../../components/primitives/EmptyState';
import { neurodeckApi } from '../../../services/bridgeAdapter';
import type { TransferPeer, TrustedPeer } from '../../../services/bridgeAdapter';

const OS_ICONS: Record<string, typeof Laptop> = {
  linux: Laptop,
  windows: Monitor,
  macos: Laptop,
};

interface Props {
  peers: TransferPeer[];
  trustedPeers: TrustedPeer[];
  onSendToPeer: (peer: TransferPeer) => void;
  onRefreshTrusted: () => void;
  onError: (msg: string) => void;
}

export function DevicesTab({ peers, trustedPeers, onSendToPeer, onRefreshTrusted, onError }: Props) {
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('42000');
  const [manualHost, setManualHost] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAddManual = async () => {
    if (!manualIp.trim()) return;
    setAdding(true);
    try {
      await neurodeckApi.transfer.addManualPeer(manualIp.trim(), Number(manualPort) || 42000, manualHost.trim() || manualIp.trim());
      setManualIp('');
      setManualHost('');
    } catch (e) {
      onError(`Failed to add peer: ${e}`);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveTrusted = async (ip: string) => {
    try {
      await neurodeckApi.transfer.trustedPeers('remove', ip);
      onRefreshTrusted();
    } catch (e) {
      onError(`Failed to remove trusted peer: ${e}`);
    }
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-1">
      {/* Discovered peers */}
      <section aria-label="Discovered devices">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-nd-text-muted">Discovered on LAN</h3>
        {peers.length === 0 ? (
          <EmptyState icon={Laptop} title="No peers found" description="NEURODECK is scanning your network via mDNS. Warpinator/Winpinator peers appear here automatically." />
        ) : (
          <ul role="list" className="flex flex-col gap-2">
            {peers.map((peer) => {
              const Icon = OS_ICONS[peer.os.toLowerCase()] ?? Laptop;
              return (
                <li
                  key={peer.ip}
                  className="flex items-center gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-4 py-3"
                >
                  <Icon className="h-5 w-5 shrink-0 text-nd-accent" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-nd-text">{peer.hostname}</p>
                    <p className="text-xs text-nd-text-muted">{peer.ip}:{peer.port} · {peer.os} {peer.is_warpinator ? '· Warpinator' : ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSendToPeer(peer)}
                    aria-label={`Send file to ${peer.hostname}`}
                    className="flex items-center gap-1.5 rounded-lg border border-nd-accent/25 bg-nd-accent/10 px-3 py-1.5 text-xs font-medium text-nd-accent hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" /> Send
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Manual peer add */}
      <section aria-label="Add manual peer">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-nd-text-muted">Add VPN / Manual Peer</h3>
        <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={manualIp}
              onChange={(e) => setManualIp(e.target.value)}
              placeholder="IP address (e.g. 10.8.0.2)"
              aria-label="Peer IP address"
              className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
            />
            <input
              type="text"
              value={manualPort}
              onChange={(e) => setManualPort(e.target.value)}
              placeholder="Port"
              aria-label="Peer port"
              className="w-24 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
            />
            <input
              type="text"
              value={manualHost}
              onChange={(e) => setManualHost(e.target.value)}
              placeholder="Display name (optional)"
              aria-label="Peer display name"
              className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
            />
            <button
              type="button"
              onClick={() => void handleAddManual()}
              disabled={adding || !manualIp.trim()}
              aria-label="Add manual peer"
              className="flex items-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 disabled:pointer-events-none disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Add
            </button>
          </div>
        </div>
      </section>

      {/* Trusted peers */}
      {trustedPeers.length > 0 && (
        <section aria-label="Trusted peers">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-nd-text-muted">Trusted Peers</h3>
          <ul role="list" className="flex flex-col gap-2">
            {trustedPeers.map((peer) => (
              <li
                key={peer.ip}
                className="flex items-center gap-3 rounded-xl border border-nd-success/15 bg-nd-success/5 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-nd-text">{peer.label || peer.ip}</p>
                  <p className="text-xs text-nd-text-muted">{peer.ip} · Added {new Date(peer.added_at).toLocaleDateString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemoveTrusted(peer.ip)}
                  aria-label={`Remove trusted peer ${peer.label || peer.ip}`}
                  className="rounded-lg p-2 text-nd-text-muted hover:bg-nd-danger/10 hover:text-nd-danger focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-danger/40"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
