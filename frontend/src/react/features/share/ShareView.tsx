import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Share2, Users, ArrowUpDown, Send, Radio,
  CheckCircle2, XCircle, X, Download, Upload, Loader2,
  Wifi, AlertTriangle, KeyRound, ArrowLeftRight
} from 'lucide-react';
import { neurodeckApi, listenBridge } from '../../services/bridgeAdapter';
import type { DiscoveredPeer, FileTransfer } from '../../services/bridgeAdapter';
import { TorrentView } from '../torrent/TorrentView';
import { EmptyState } from '../../components/primitives/EmptyState';

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
    <>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void sendFile()}
          placeholder="File path to send..."
          aria-label="File path to send"
          className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
        />
        <button
          type="button"
          onClick={() => void sendFile()}
          disabled={loading || !filePath.trim()}
          className="flex items-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 px-4 py-2 text-sm font-medium text-nd-success hover:bg-nd-success/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
        >
          <Send className="h-4 w-4" aria-hidden="true" /> Send
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-64 flex-col overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
            <Users className="h-3.5 w-3.5" aria-hidden="true" /> Peers ({peers.length})
          </div>
          <div className="mt-2 space-y-2">
            {peers.map((peer) => (
              <div key={peer.id} className="rounded-lg border border-nd-text-muted/15 bg-nd-surface/50 p-2">
                <p className="text-xs font-medium text-nd-text/90">{peer.name}</p>
                <p className="text-[10px] font-mono text-nd-text-muted/70">{peer.address}</p>
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

        <div className="flex min-w-0 flex-1 flex-col overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-nd-text-muted">
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" /> Active Transfers
          </div>
          <div className="mt-2 space-y-2">
            {transfers.map((t) => (
              <div key={t.id} className="rounded-lg border border-nd-text-muted/15 bg-nd-surface/50 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-nd-text/90">{t.filename}</span>
                  <span className="text-[10px] text-nd-text-muted">{t.status}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-nd-text/10">
                  <div className="h-full rounded-full bg-nd-accent transition-all" style={{ width: `${t.progress}%` }} />
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
    </>
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scrollbar-thin">
      {/* Notice */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
            notice.kind === 'ok'
              ? 'border-nd-success/25 bg-nd-success/10 text-nd-success'
              : 'border-nd-danger/25 bg-nd-danger/10 text-nd-danger'
          }`}
        >
          {notice.text}
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Service status card */}
      <div className="flex items-center gap-3 rounded-2xl border border-nd-accent/20 bg-nd-accent/[0.03] px-4 py-3">
        <Radio className="h-5 w-5 shrink-0 text-nd-accent" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-nd-text">Warpinator gRPC Service</p>
          <p className="text-[10px] text-nd-text-muted">Listening on port 42000 · mDNS discovery active</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-nd-success/30 bg-nd-success/10 px-2 py-0.5 text-[10px] font-bold text-nd-success">
          <span className="h-1.5 w-1.5 rounded-full bg-nd-success" aria-hidden="true" />
          RUNNING
        </span>
      </div>

      {/* Group code */}
      <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-nd-accent" aria-hidden="true" />
          <h3 className="text-xs font-semibold text-nd-text">Group Code</h3>
          {groupCode && (
            <span className="ml-auto rounded-full border border-nd-success/30 bg-nd-success/10 px-2 py-0.5 text-[10px] font-mono font-bold text-nd-success">
              {groupCode}
            </span>
          )}
        </div>
        <p className="mb-3 text-[10px] text-nd-text-muted">
          Warpinator peers on the same group code are discoverable. Leave blank to use the default group.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void saveGroupCode()}
            placeholder="e.g. NEURODECK"
            aria-label="Warpinator group code"
            className="flex-1 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-mono text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
          />
          <button
            type="button"
            onClick={() => void saveGroupCode()}
            disabled={savingCode || !codeInput.trim() || codeInput === groupCode}
            className="flex items-center gap-1.5 rounded-xl border border-nd-accent/30 bg-nd-accent/10 px-4 py-2 text-xs font-semibold text-nd-accent hover:bg-nd-accent/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
          >
            {savingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            Save
          </button>
        </div>
      </div>

      {/* Incoming transfer requests */}
      {pendingIncoming.length > 0 && (
        <div className="rounded-2xl border border-nd-warning/25 bg-nd-warning/[0.04] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Download className="h-4 w-4 text-nd-warning" aria-hidden="true" />
            <h3 className="text-xs font-semibold text-nd-text">
              Incoming Requests ({pendingIncoming.length})
            </h3>
          </div>
          <div className="space-y-2">
            {pendingIncoming.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-nd-warning/20 bg-nd-surface/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-nd-text">{t.filename}</p>
                  <p className="text-[10px] text-nd-text-muted">
                    From {t.peer_name} · {t.size > 0 ? formatBytes(t.size) : 'unknown size'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void accept(t.id)}
                  aria-label={`Accept ${t.filename}`}
                  className="flex items-center gap-1 rounded-lg border border-nd-success/30 bg-nd-success/10 px-2.5 py-1.5 text-[11px] font-semibold text-nd-success hover:bg-nd-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-success/40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Accept
                </button>
                <button
                  type="button"
                  onClick={() => void reject(t.id)}
                  aria-label={`Reject ${t.filename}`}
                  className="flex items-center gap-1 rounded-lg border border-nd-danger/30 bg-nd-danger/10 px-2.5 py-1.5 text-[11px] font-semibold text-nd-danger hover:bg-nd-danger/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Reject
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peer list + send */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Warpinator peers */}
        <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Wifi className="h-4 w-4 text-nd-accent" aria-hidden="true" />
            <h3 className="text-xs font-semibold text-nd-text">Warpinator Peers</h3>
            <span className="ml-auto rounded-full border border-nd-text-muted/20 bg-nd-surface/60 px-2 py-0.5 text-[10px] text-nd-text-muted">
              {peers.length}
            </span>
          </div>
          {peers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <AlertTriangle className="h-5 w-5 text-nd-text-muted/40" aria-hidden="true" />
              <p className="text-xs text-nd-text-muted">
                No Warpinator peers found. Ensure peers use the same group code and are on the same LAN.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {peers.map((peer) => (
                <button
                  key={peer.ip}
                  type="button"
                  onClick={() => setSelectedPeerIp(peer.ip)}
                  aria-pressed={selectedPeerIp === peer.ip}
                  className={`w-full rounded-xl border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                    selectedPeerIp === peer.ip
                      ? 'border-nd-accent/40 bg-nd-accent/[0.06]'
                      : 'border-nd-text-muted/15 bg-nd-surface/40 hover:border-nd-accent/25'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${selectedPeerIp === peer.ip ? 'bg-nd-accent' : 'bg-nd-text-muted/40'}`} aria-hidden="true" />
                    <p className="text-xs font-semibold text-nd-text truncate">{peer.hostname}</p>
                    <span className="ml-auto shrink-0 rounded px-1 py-0.5 text-[9px] font-mono text-nd-text-muted/70">{peer.os}</span>
                  </div>
                  <p className="mt-0.5 pl-4 text-[10px] font-mono text-nd-text-muted/70">{peer.ip}:{peer.port}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send file */}
        <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Upload className="h-4 w-4 text-nd-accent" aria-hidden="true" />
            <h3 className="text-xs font-semibold text-nd-text">Send File</h3>
          </div>
          <div className="space-y-2">
            <div>
              <label htmlFor="warp-file-path" className="mb-1 block text-[10px] text-nd-text-muted">
                File path
              </label>
              <input
                id="warp-file-path"
                type="text"
                value={sendPath}
                onChange={(e) => setSendPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void sendFile()}
                placeholder="/path/to/file"
                className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm font-mono text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
              />
            </div>
            {peers.length > 0 && (
              <div>
                <label htmlFor="warp-peer-select" className="mb-1 block text-[10px] text-nd-text-muted">
                  Target peer
                </label>
                <select
                  id="warp-peer-select"
                  value={selectedPeerIp}
                  onChange={(e) => setSelectedPeerIp(e.target.value)}
                  className="w-full rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
                >
                  {peers.map((p) => (
                    <option key={p.ip} value={p.ip}>{p.hostname} ({p.ip})</option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={() => void sendFile()}
              disabled={sending || !sendPath.trim() || !selectedPeerIp}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-nd-success/30 bg-nd-success/10 py-2.5 text-sm font-semibold text-nd-success hover:bg-nd-success/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
            >
              {sending
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <Send className="h-4 w-4" aria-hidden="true" />}
              Send via Warpinator
            </button>
          </div>
        </div>
      </div>

      {/* Active transfers */}
      {activeTransfers.length > 0 && (
        <div className="rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-nd-accent" aria-hidden="true" />
            <h3 className="text-xs font-semibold text-nd-text">Transfers ({activeTransfers.length})</h3>
          </div>
          <div className="space-y-2">
            {activeTransfers.map((t) => {
              const pct = t.size > 0 ? Math.min(100, Math.round((t.progress / t.size) * 100)) : 0;
              const isActive = t.status === 'Transferring';
              const isDone = t.status === 'Completed';
              const isFailed = t.status === 'Failed';
              return (
                <div key={t.id} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {t.direction === 'Incoming'
                        ? <Download className="h-4 w-4 text-nd-accent" aria-hidden="true" />
                        : <Upload className="h-4 w-4 text-nd-success" aria-hidden="true" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-nd-text">{t.filename}</p>
                        <span className={`shrink-0 text-[10px] font-bold ${isDone ? 'text-nd-success' : isFailed ? 'text-nd-danger' : 'text-nd-text-muted'}`}>
                          {t.status}
                        </span>
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
                          <div className="h-1.5 overflow-hidden rounded-full bg-nd-text/10">
                            <div
                              className={`h-full rounded-full transition-all ${isDone ? 'bg-nd-success' : isFailed ? 'bg-nd-danger' : 'bg-nd-accent'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {!isDone && !isFailed && (
                      <button
                        type="button"
                        onClick={() => void cancel(t.id)}
                        aria-label={`Cancel ${t.filename}`}
                        className="shrink-0 rounded-lg p-1.5 text-nd-text-muted hover:bg-nd-surface/60 hover:text-nd-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
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
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-nd-accent/20 bg-nd-accent/10">
          <Share2 className="h-5 w-5 text-nd-accent" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="share-view-kicker text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Share</div>
          <h2 className="text-lg font-semibold text-nd-text">Share & Transfer</h2>
          <p className="text-xs text-nd-text-muted">LAN P2P · Warpinator · Torrent</p>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Share panels" className="share-inner-tabs mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activePanel === tab.id}
            onClick={() => setActivePanel(tab.id)}
            data-panel={tab.id}
            className={`share-inner-tab ${activePanel === tab.id ? 'active' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40`}
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
