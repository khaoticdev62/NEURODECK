import { useState } from 'react';
import { Send, Laptop, Trash2, Plus, Monitor } from 'lucide-react';
import { EmptyState } from '../../../components/primitives/EmptyState';
import { Button } from '../../../components/primitives/Button';
import { IconButton } from '../../../components/primitives/IconButton';
import { Panel } from '../../../components/primitives/Panel';
import { TextInput } from '../../../components/primitives/TextInput';
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
      await neurodeckApi.transfer.addManualPeer(
        manualIp.trim(),
        Number(manualPort) || 42000,
        manualHost.trim() || manualIp.trim()
      );
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
    <Panel eyebrow="Devices" title="Discovered & Trusted Peers" className="h-full">
      <div className="flex h-full flex-col gap-5 overflow-y-auto">
        {/* Discovered peers */}
        <section aria-label="Discovered devices">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
            Discovered on LAN
          </h3>
          {peers.length === 0 ? (
            <EmptyState
              icon={Laptop}
              title="No peers found"
              description="NEURODECK is scanning your network via mDNS. Warpinator/Winpinator peers appear here automatically."
              compact
            />
          ) : (
            <ul role="list" className="flex flex-col gap-2">
              {peers.map((peer) => {
                const Icon = OS_ICONS[peer.os.toLowerCase()] ?? Laptop;
                return (
                  <li
                    key={peer.ip}
                    className="flex items-center gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-4 py-3 transition-colors duration-fast hover:border-nd-accent-primary/25"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/60">
                      <Icon className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-nd-text-primary">{peer.hostname}</p>
                      <p className="text-xs text-nd-text-muted">
                        {peer.ip}:{peer.port} · {peer.os} {peer.is_warpinator ? '· Warpinator' : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      icon={Send}
                      onClick={() => onSendToPeer(peer)}
                    >
                      Send
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Manual peer add */}
        <section aria-label="Add manual peer">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
            Add VPN / Manual Peer
          </h3>
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <TextInput
                label="IP address"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="e.g. 10.8.0.2"
                fullWidth
              />
              <TextInput
                label="Port"
                value={manualPort}
                onChange={(e) => setManualPort(e.target.value)}
                placeholder="42000"
                className="sm:w-24"
              />
              <TextInput
                label="Display name"
                value={manualHost}
                onChange={(e) => setManualHost(e.target.value)}
                placeholder="Optional"
                fullWidth
              />
              <Button
                type="button"
                variant="primary"
                size="md"
                icon={Plus}
                loading={adding}
                disabled={adding || !manualIp.trim()}
                onClick={() => void handleAddManual()}
              >
                Add
              </Button>
            </div>
          </div>
        </section>

        {/* Trusted peers */}
        {trustedPeers.length > 0 && (
          <section aria-label="Trusted peers">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
              Trusted Peers
            </h3>
            <ul role="list" className="flex flex-col gap-2">
              {trustedPeers.map((peer) => (
                <li
                  key={peer.ip}
                  className="flex items-center gap-3 rounded-xl border border-nd-accent-success/20 bg-nd-accent-success/5 px-4 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-accent-success/20 bg-nd-accent-success/10">
                    <Laptop className="h-4 w-4 text-nd-accent-success" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-nd-text-primary">{peer.label || peer.ip}</p>
                    <p className="text-xs text-nd-text-muted">
                      {peer.ip} · Added {new Date(peer.added_at).toLocaleDateString()}
                    </p>
                  </div>
                  <IconButton
                    type="button"
                    size="md"
                    variant="danger"
                    aria-label={`Remove trusted peer ${peer.label || peer.ip}`}
                    onClick={() => void handleRemoveTrusted(peer.ip)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Panel>
  );
}
