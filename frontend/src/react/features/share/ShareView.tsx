import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Share2, Users, ArrowUpDown, Send, Radio,
  CheckCircle2, XCircle, X, Download, Upload,
  Wifi, AlertTriangle, KeyRound, ArrowLeftRight
} from 'lucide-react';
import { neurodeckApi, listenBridge } from '../../services/bridgeAdapter';
import type { DiscoveredPeer, FileTransfer } from '../../services/bridgeAdapter';
import { TorrentView } from '../torrent/TorrentView';
import { EmptyState } from '../../components/primitives/EmptyState';
import { Button } from '../../components/primitives/Button';
import { IconButton } from '../../components/primitives/IconButton';
import { Panel } from '../../components/primitives/Panel';
import { Select } from '../../components/primitives/Select';
import { StatusChip } from '../../components/primitives/StatusChip';
import { TextInput } from '../../components/primitives/TextInput';
import { Badge } from '../../components/primitives/Badge';


// ── LAN P2P Panel ─────────────────────────────────────────────────────────────

interface LegacyPeer {
  id: string;
  name: string;
  address: string;
}

interface LegacyTransfer {
  id: string;
  filename: string;
  progress: number;
  status: string;
}

function LanPanel() {
  const [peers, setPeers] = useState<LegacyPeer[]>([]);
  const [transfers, setTransfers] = useState<LegacyTransfer[]>([]);
  const [filePath, setFilePath] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [rawPeers, rawTransfers] = await Promise.all([
        neurodeckApi.share.getPeers(),
        neurodeckApi.share.getActiveTransfers(),
      ]);
      // Map Rust Peer struct → legacy display shape
      setPeers(
        rawPeers
          .filter((p) => !p.is_warpinator)
          .map((p) => ({ id: p.ip, name: p.hostname, address: p.ip }))
      );
      setTransfers(
        rawTransfers
          .filter((t) => !['Pending'].includes(t.status))
          .map((t) => ({
            id: t.id,
            filename: t.filename,
            progress: t.size > 0 ? Math.round((t.progress / t.size) * 100) : 0,
            status: t.status,
          }))
      );
    } catch (_) { /* ignore — backend may not be ready */ }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 5000);
    return () => clearInterval(interval);
  }, [load]);

  const sendFile = async () => {
    if (!filePath.trim()) return;
    setLoading(true);
    try {
      await neurodeckApi.share.startTransfer(filePath.trim());
      setFilePath('');
      await load();
    } catch (_) {
      // Transfer errors surface in the transfers list from the backend
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel eyebrow="LAN" title="Local Network P2P" className="h-full">
      <div className="flex h-full flex-col gap-4">
        <div className="flex gap-2">
          <TextInput
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void sendFile()}
            placeholder="File path to send..."
            aria-label="File path to send"
            fullWidth
          />
          <Button
            type="button"
            variant="primary"
            size="md"
            icon={Send}
            loading={loading}
            disabled={loading || !filePath.trim()}
            onClick={() => void sendFile()}
          >
            Send
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex w-64 flex-col gap-2 overflow-auto rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-nd-text-muted">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Peers ({peers.length})
            </div>
            <div className="flex flex-col gap-2">
              {peers.map((peer) => (
                <div
                  key={peer.id}
                  className="rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/60 p-2.5 transition-colors duration-fast hover:border-nd-accent-primary/25"
                >
                  <p className="text-xs font-medium text-nd-text-primary">{peer.name}</p>
                  <p className="text-[10px] font-mono text-nd-text-muted">{peer.address}</p>
                </div>
              ))}
              {!peers.length && (
                <EmptyState
                  compact
                  icon={Wifi}
                  title="No peers discovered"
                  description="Ensure devices are on the same network with NEURODECK running."
                />
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-auto rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-nd-text-muted">
              <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
              Active Transfers
            </div>
            <div className="flex flex-col gap-2">
              {transfers.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/60 p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-nd-text-primary">{t.filename}</span>
                    <StatusChip size="sm" tone={t.status === 'Completed' ? 'success' : t.status === 'Failed' ? 'error' : 'info'}>
                      {t.status}
                    </StatusChip>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-nd-surface-tertiary/60">
                    <div
                      className="h-full rounded-full bg-nd-accent-primary transition-all duration-normal motion-reduce:transition-none"
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                </div>
              ))}
              {!transfers.length && (
                <EmptyState
                  compact
                  icon={ArrowLeftRight}
                  title="No active transfers"
                  description="Select a discovered peer and send a file to begin."
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ── Warpinator Panel ──────────────────────────────────────────────────────────

function WarpinatorPanel() {
  const [peers, setPeers] = useState<DiscoveredPeer[]>([]);
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [groupCode, setGroupCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [savingCode, setSavingCode] = useState(false);
  const [sendPath, setSendPath] = useState('');
  const [selectedPeerIp, setSelectedPeerIp] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (kind: 'ok' | 'error', text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ kind, text });
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  };

  const loadAll = useCallback(async () => {
    try {
      const [rawPeers, rawTransfers, codeRes] = await Promise.all([
        neurodeckApi.share.getPeers(),
        neurodeckApi.share.getActiveTransfers(),
        neurodeckApi.share.getGroupCode(),
      ]);
      const warpPeers = rawPeers.filter((p) => p.is_warpinator);
      setPeers(warpPeers);
      setTransfers(rawTransfers);
      setGroupCode(codeRes.code ?? '');
      setCodeInput(codeRes.code ?? '');
      if (warpPeers.length > 0 && !selectedPeerIp) {
        setSelectedPeerIp(warpPeers[0].ip);
      }
    } catch (_) { /* backend may not be ready */ }
  }, [selectedPeerIp]);

  // Initial load
  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // WebSocket event subscriptions
  useEffect(() => {
    const unsubPeers = listenBridge('peers_updated', (payload) => {
      const list = payload as DiscoveredPeer[];
      const warpPeers = list.filter((p) => p.is_warpinator);
      setPeers(warpPeers);
      if (warpPeers.length > 0) {
        setSelectedPeerIp((prev) => prev || warpPeers[0].ip);
      }
    });

    const unsubIncoming = listenBridge('transfer_incoming', (payload) => {
      const t = payload as FileTransfer;
      setTransfers((prev) => {
        const exists = prev.some((x) => x.id === t.id);
        return exists ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
      });
      showNotice('ok', `Incoming: ${t.filename} from ${t.peer_name}`);
    });

    const unsubProgress = listenBridge('transfer_progress', (payload) => {
      const [id, bytesTransferred] = payload as [string, number];
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, progress: bytesTransferred, status: 'Transferring' }
            : t
        )
      );
    });

    const unsubCompleted = listenBridge('transfer_completed', (payload) => {
      const id = payload as string;
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'Completed', progress: t.size } : t))
      );
    });

    const unsubFailed = listenBridge('transfer_failed', (payload) => {
      const id = payload as string;
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'Failed' } : t))
      );
    });

    return () => {
      unsubPeers();
      unsubIncoming();
      unsubProgress();
      unsubCompleted();
      unsubFailed();
    };
  }, []);

  const saveGroupCode = async () => {
    if (!codeInput.trim()) return;
    setSavingCode(true);
    try {
      await neurodeckApi.share.setGroupCode(codeInput.trim());
      setGroupCode(codeInput.trim());
      showNotice('ok', 'Group code updated. Warpinator peers on the same code will appear below.');
    } catch (e) {
      showNotice('error', `Failed to set group code: ${e}`);
    } finally {
      setSavingCode(false);
    }
  };

  const sendFile = async () => {
    if (!sendPath.trim() || !selectedPeerIp) return;
    setSending(true);
    try {
      await neurodeckApi.share.startTransfer(sendPath.trim(), selectedPeerIp);
      setSendPath('');
      showNotice('ok', 'Transfer started.');
    } catch (e) {
      showNotice('error', `Send failed: ${e}`);
    } finally {
      setSending(false);
    }
  };

  const accept = async (id: string) => {
    try {
      await neurodeckApi.share.respondToTransfer(id, true);
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'Accepted' } : t))
      );
    } catch (e) {
      showNotice('error', `Accept failed: ${e}`);
    }
  };

  const reject = async (id: string) => {
    try {
      await neurodeckApi.share.respondToTransfer(id, false);
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'Rejected' } : t))
      );
    } catch (e) {
      showNotice('error', `Reject failed: ${e}`);
    }
  };

  const cancel = async (id: string) => {
    try {
      await neurodeckApi.share.cancelTransfer(id);
      setTransfers((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      showNotice('error', `Cancel failed: ${e}`);
    }
  };

  const pendingIncoming = transfers.filter((t) => t.direction === 'Incoming' && t.status === 'Pending');
  const activeTransfers = transfers.filter((t) => !['Rejected', 'Cancelled'].includes(t.status) && !(t.direction === 'Incoming' && t.status === 'Pending'));

  const peerOptions = peers.map((p) => ({ value: p.ip, label: `${p.hostname} (${p.ip})` }));

  return (
    <Panel eyebrow="Warpinator" title="Cross-Platform P2P" className="h-full">
      <div className="flex h-full flex-col gap-4 overflow-y-auto">
        {/* Notice */}
        {notice && (
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
              notice.kind === 'ok'
                ? 'border-nd-accent-success/25 bg-nd-accent-success/10 text-nd-accent-success'
                : 'border-nd-accent-error/25 bg-nd-accent-error/10 text-nd-accent-error'
            }`}
          >
            {notice.text}
            <IconButton
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Dismiss"
              onClick={() => setNotice(null)}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        )}

        {/* Service status card */}
        <div className="flex items-center gap-3 rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/[0.04] px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-accent-primary/20 bg-nd-accent-primary/10">
            <Radio className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-nd-text-primary">Warpinator gRPC Service</p>
            <p className="text-[10px] text-nd-text-muted">Listening on port 42000 · mDNS discovery active</p>
          </div>
          <Badge tone="success" variant="outline" dot>
            RUNNING
          </Badge>
        </div>

        {/* Group code */}
        <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
          <div className="mb-2 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
            <h3 className="text-xs font-semibold text-nd-text-primary">Group Code</h3>
            {groupCode && (
              <Badge tone="success" variant="outline" size="sm" className="ml-auto">
                {groupCode}
              </Badge>
            )}
          </div>
          <p className="mb-3 text-[10px] text-nd-text-muted">
            Warpinator peers on the same group code are discoverable. Leave blank to use the default group.
          </p>
          <div className="flex gap-2">
            <TextInput
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void saveGroupCode()}
              placeholder="e.g. NEURODECK"
              aria-label="Warpinator group code"
              fullWidth
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              loading={savingCode}
              disabled={savingCode || !codeInput.trim() || codeInput === groupCode}
              onClick={() => void saveGroupCode()}
            >
              Save
            </Button>
          </div>
        </div>

        {/* Incoming transfer requests */}
        {pendingIncoming.length > 0 && (
          <div className="rounded-xl border border-nd-accent-warning/25 bg-nd-accent-warning/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Download className="h-4 w-4 text-nd-accent-warning" aria-hidden="true" />
              <h3 className="text-xs font-semibold text-nd-text-primary">
                Incoming Requests ({pendingIncoming.length})
              </h3>
            </div>
            <div className="flex flex-col gap-2">
              {pendingIncoming.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border border-nd-accent-warning/20 bg-nd-accent-warning/5 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-nd-text-primary">{t.filename}</p>
                    <p className="text-[10px] text-nd-text-muted">
                      From {t.peer_name} · {t.size > 0 ? formatBytes(t.size) : 'unknown size'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    icon={CheckCircle2}
                    onClick={() => void accept(t.id)}
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="danger"
                    icon={XCircle}
                    onClick={() => void reject(t.id)}
                  >
                    Reject
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Peer list + send */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Warpinator peers */}
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Wifi className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold text-nd-text-primary">Warpinator Peers</h3>
              <Badge tone="neutral" variant="outline" size="sm" className="ml-auto">
                {peers.length}
              </Badge>
            </div>
            {peers.length === 0 ? (
              <EmptyState
                compact
                icon={AlertTriangle}
                title="No Warpinator peers found"
                description="Ensure peers use the same group code and are on the same LAN."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {peers.map((peer) => (
                  <button
                    key={peer.ip}
                    type="button"
                    onClick={() => setSelectedPeerIp(peer.ip)}
                    aria-pressed={selectedPeerIp === peer.ip}
                    className={`w-full rounded-lg border p-2.5 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/40 ${
                      selectedPeerIp === peer.ip
                        ? 'border-nd-accent-primary/40 bg-nd-accent-primary/[0.06]'
                        : 'border-nd-border-subtle bg-nd-surface-secondary/60 hover:border-nd-accent-primary/25'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          selectedPeerIp === peer.ip ? 'bg-nd-accent-primary' : 'bg-nd-text-muted/40'
                        }`}
                        aria-hidden="true"
                      />
                      <p className="truncate text-xs font-semibold text-nd-text-primary">{peer.hostname}</p>
                      <span className="ml-auto shrink-0 rounded px-1 py-0.5 text-[9px] font-mono text-nd-text-muted">
                        {peer.os}
                      </span>
                    </div>
                    <p className="mt-0.5 pl-4 text-[10px] font-mono text-nd-text-muted">{peer.ip}:{peer.port}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Send file */}
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold text-nd-text-primary">Send File</h3>
            </div>
            <div className="flex flex-col gap-3">
              <TextInput
                id="warp-file-path"
                label="File path"
                value={sendPath}
                onChange={(e) => setSendPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void sendFile()}
                placeholder="/path/to/file"
                fullWidth
              />
              {peers.length > 0 && (
                <Select
                  id="warp-peer-select"
                  label="Target peer"
                  value={selectedPeerIp}
                  onChange={(e) => setSelectedPeerIp(e.target.value)}
                  options={peerOptions}
                  fullWidth
                />
              )}
              <Button
                type="button"
                variant="primary"
                size="md"
                fullWidth
                icon={Send}
                loading={sending}
                disabled={sending || !sendPath.trim() || !selectedPeerIp}
                onClick={() => void sendFile()}
              >
                Send via Warpinator
              </Button>
            </div>
          </div>
        </div>

        {/* Active transfers */}
        {activeTransfers.length > 0 && (
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold text-nd-text-primary">Transfers ({activeTransfers.length})</h3>
            </div>
            <div className="flex flex-col gap-2">
              {activeTransfers.map((t) => {
                const pct = t.size > 0 ? Math.min(100, Math.round((t.progress / t.size) * 100)) : 0;
                const isActive = t.status === 'Transferring';
                const isDone = t.status === 'Completed';
                const isFailed = t.status === 'Failed';
                return (
                  <div
                    key={t.id}
                    className="rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/60 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {t.direction === 'Incoming'
                          ? <Download className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
                          : <Upload className="h-4 w-4 text-nd-accent-success" aria-hidden="true" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-nd-text-primary">{t.filename}</p>
                          <StatusChip
                            size="sm"
                            tone={isDone ? 'success' : isFailed ? 'error' : isActive ? 'info' : 'warning'}
                            pulse={isActive}
                          >
                            {t.status}
                          </StatusChip>
                        </div>
                        <p className="text-[10px] text-nd-text-muted">
                          {t.peer_name} · {formatBytes(t.size)}
                        </p>
                        {(isActive || pct > 0) && (
                          <div className="mt-2">
                            <div className="mb-1 flex justify-between text-[10px] text-nd-text-muted">
                              <span>{formatBytes(t.progress)} / {formatBytes(t.size)}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-nd-surface-tertiary/60">
                              <div
                                className={`h-full rounded-full transition-all duration-normal motion-reduce:transition-none ${
                                  isDone ? 'bg-nd-accent-success' : isFailed ? 'bg-nd-accent-error' : 'bg-nd-accent-primary'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      {!isDone && !isFailed && (
                        <IconButton
                          type="button"
                          size="md"
                          variant="danger"
                          aria-label={`Cancel ${t.filename}`}
                          onClick={() => void cancel(t.id)}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </IconButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ── ShareView ─────────────────────────────────────────────────────────────────

type SharePanel = 'lan' | 'warpinator' | 'torrent';

export function ShareView() {
  const [activePanel, setActivePanel] = useState<SharePanel>('lan');

  const tabs: { id: SharePanel; label: string }[] = [
    { id: 'lan', label: 'LAN P2P' },
    { id: 'warpinator', label: 'Warpinator' },
    { id: 'torrent', label: 'Torrent' },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
          <Share2 className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-nd-text-muted">Share</p>
          <h2 className="text-lg font-semibold text-nd-text-primary">Share & Transfer</h2>
          <p className="text-xs text-nd-text-muted">LAN P2P · Warpinator · Torrent</p>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Share panels" className="mb-3 flex gap-1 overflow-x-auto rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/60 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activePanel === tab.id}
            onClick={() => setActivePanel(tab.id)}
            data-panel={tab.id}
            className={`relative flex min-h-[40px] shrink-0 items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60 ${
              activePanel === tab.id
                ? 'bg-nd-surface-tertiary text-nd-text-primary shadow-sm'
                : 'text-nd-text-muted hover:bg-nd-surface-hover hover:text-nd-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel areas — keep all mounted to preserve state */}
      <div className={`flex min-h-0 flex-1 flex-col ${activePanel === 'lan' ? '' : 'hidden'}`}>
        <LanPanel />
      </div>
      <div className={`flex min-h-0 flex-1 flex-col ${activePanel === 'warpinator' ? '' : 'hidden'}`}>
        <WarpinatorPanel />
      </div>
      <div id="share-panel-torrent" className={`flex min-h-0 flex-1 flex-col ${activePanel === 'torrent' ? 'active' : 'hidden'}`}>
        <TorrentView />
      </div>
    </div>
  );
}
