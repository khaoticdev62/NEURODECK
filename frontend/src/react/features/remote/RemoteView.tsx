import { useCallback, useEffect, useRef, useState } from 'react';
import { Power, PowerOff, Radio, Copy, Users, Clock, Bell, Send } from 'lucide-react';
import QRCode from 'qrcode';
import { neurodeckApi } from '../../services/bridgeAdapter';

interface LogEntry {
  text: string;
  tone: 'info' | 'success' | 'warn' | 'error';
  time: string;
}

export function RemoteView() {
  const [status, setStatus] = useState<{
    running: boolean;
    url?: string;
    clients?: number;
    pin?: string;
    port?: number;
    ip?: string;
    ttl_seconds_remaining?: number;
  }>({ running: false });
  const [port, setPort] = useState(9090);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [ttl, setTtl] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifText, setNotifText] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'success' | 'warn' | 'error'>('info');
  const [sendingNotif, setSendingNotif] = useState(false);
  const ttlTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const log = useCallback((text: string, tone: LogEntry['tone'] = 'info') => {
    setLogs((prev) => [
      ...prev.slice(-199),
      { text, tone, time: new Date().toLocaleTimeString('en-US', { hour12: false }) },
    ]);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const info = await neurodeckApi.remote.getInfo();
      setStatus(info);
      if (info.running && info.ttl_seconds_remaining != null) {
        setTtl((prev) => {
          // Only reset from server if our local countdown drifts > 5s
          if (Math.abs(prev - info.ttl_seconds_remaining!) > 5) {
            return info.ttl_seconds_remaining!;
          }
          return prev;
        });
      }
    } catch (_) { /* ignore */ }
  }, []);

  // Poll server info every 5s
  useEffect(() => {
    void refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Generate QR code when URL changes
  useEffect(() => {
    if (status.running && status.url) {
      const accentColor =
        getComputedStyle(document.documentElement).getPropertyValue('--nd-accent-primary').trim() || '#5EEBFF';
      const bgColor =
        getComputedStyle(document.documentElement).getPropertyValue('--nd-surface-app').trim() || '#0A0D10';
      QRCode.toDataURL(status.url, {
        width: 160,
        margin: 1,
        color: { dark: accentColor, light: bgColor },
      })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(''));
    } else {
      setQrDataUrl('');
    }
  }, [status.running, status.url]);

  // Local TTL countdown tick
  useEffect(() => {
    if (status.running && ttl > 0) {
      if (ttlTimer.current) clearInterval(ttlTimer.current);
      ttlTimer.current = setInterval(() => {
        setTtl((prev) => {
          if (prev <= 1) {
            if (ttlTimer.current) clearInterval(ttlTimer.current);
            log('Session token expired. Restart the server to refresh.', 'warn');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (ttlTimer.current) clearInterval(ttlTimer.current);
    };
  }, [status.running, ttl, log]);

  // Auto-scroll event log
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Subscribe to bridge events (replaces the raw WebSocket connection)
  useEffect(() => {
    const unsubConnect = neurodeckApi.remote.onClientConnected((count) => {
      log(`Client connected (${count} total)`, 'success');
      setStatus((s) => ({ ...s, clients: count }));
    });
    const unsubDisconnect = neurodeckApi.remote.onClientDisconnected((count) => {
      log(`Client disconnected (${count} remaining)`, 'warn');
      setStatus((s) => ({ ...s, clients: count }));
    });
    const unsubChat = neurodeckApi.remote.onChat((text) => {
      log(`Remote chat: ${String(text).slice(0, 80)}`, 'info');
    });
    const unsubNav = neurodeckApi.remote.onNavigate((view) => {
      log(`Remote navigate → ${view}`, 'info');
    });
    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubChat();
      unsubNav();
    };
  }, [log]);

  const toggle = async () => {
    setLoading(true);
    try {
      if (status.running) {
        await neurodeckApi.remote.stop();
        setTtl(0);
        log('Server stopped.', 'warn');
      } else {
        const info = await neurodeckApi.remote.start(port);
        log(`Server started: ${info.url ?? ''}`, 'success');
        log(`PIN: ${info.pin ?? ''}`, 'success');
      }
      await refresh();
    } catch (err) {
      log(`Failed: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (status.url) void navigator.clipboard.writeText(status.url);
  };

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifText.trim()) return;
    setSendingNotif(true);
    try {
      const res = await neurodeckApi.remote.pushNotification({
        title: notifTitle.trim(),
        text: notifText.trim(),
        type: notifType,
      });
      if (res.status === 'relayed') {
        log(`Notification relayed: "${notifTitle}"`, 'success');
        setNotifTitle('');
        setNotifText('');
      } else {
        log('No remote clients connected — notification not delivered.', 'warn');
      }
    } catch (err) {
      log(`Notification failed: ${err}`, 'error');
    } finally {
      setSendingNotif(false);
    }
  };

  const formatTtl = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div data-testid="remote-view" className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
            status.running ? 'border-nd-success/30 bg-nd-success/10' : 'border-nd-accent/20 bg-nd-accent/10'
          }`}
        >
          <Radio className={`h-5 w-5 ${status.running ? 'text-nd-success' : 'text-nd-accent'}`} />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-nd-text-muted">Remote</div>
          <h2 className="text-lg font-semibold text-nd-text">Remote Control</h2>
          <p className="text-xs text-nd-text-muted">Mobile-friendly web remote server</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Main panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-5">
          {/* Status badge */}
          <div data-testid="remote-status-badge" className="flex items-center gap-4 rounded-2xl border border-nd-text-muted/15 bg-nd-surface/50 p-4">
            <div
              className={`h-3 w-3 rounded-full ${
                status.running ? 'bg-nd-success shadow-[0_0_8px_rgba(124,255,178,0.5)]' : 'bg-nd-text-muted/40'
              }`}
            />
            <span className="text-sm font-medium text-nd-text/90">
              {status.running ? 'Server Running' : 'Server Offline'}
            </span>
            {status.clients !== undefined && status.running && (
              <span className="ml-auto flex items-center gap-1 text-xs text-nd-text-muted">
                <Users className="h-3.5 w-3.5" aria-hidden="true" /> {status.clients} client
                {status.clients === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {/* Port + Toggle */}
          <div className="flex items-end gap-3">
            <div className="space-y-2">
              <label htmlFor="remote-port" className="block text-xs font-medium text-nd-text-muted">
                Server Port
              </label>
              <input
                id="remote-port"
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                disabled={status.running || loading}
                className="w-32 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-sm text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
              />
            </div>
            <button
              type="button"
              onClick={() => void toggle()}
              disabled={loading}
              aria-label={status.running ? 'Stop remote server' : 'Start remote server'}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40 ${
                status.running
                  ? 'border border-nd-danger/30 bg-nd-danger/10 text-nd-danger hover:bg-nd-danger/20'
                  : 'border border-nd-success/30 bg-nd-success/10 text-nd-success hover:bg-nd-success/20'
              }`}
            >
              {loading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              ) : status.running ? (
                <><PowerOff className="h-4 w-4" aria-hidden="true" /> Stop Server</>
              ) : (
                <><Power className="h-4 w-4" aria-hidden="true" /> Start Server</>
              )}
            </button>
          </div>

          {/* QR + URL */}
          {status.running && status.url && (
            <div className="flex flex-col gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 sm:flex-row sm:items-center">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="Remote control QR code — scan to connect"
                  className="h-40 w-40 rounded-lg border border-nd-text-muted/15"
                />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-nd-text-muted">Remote URL</span>
                  <button
                    type="button"
                    onClick={copyUrl}
                    aria-label="Copy remote URL"
                    className="rounded text-nd-accent hover:text-nd-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="break-all font-mono text-sm text-nd-text/80">{status.url}</p>
                {status.pin && (
                  <p className="text-xs text-nd-text-muted">
                    PIN: <span className="font-mono text-nd-accent">{status.pin}</span>
                  </p>
                )}
                {ttl > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-nd-text-muted">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className={ttl < 120 ? 'text-nd-danger' : ''}>
                      Session expires in {formatTtl(ttl)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notification relay */}
          {status.running && (
            <fieldset className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 space-y-3">
              <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted">
                <Bell className="h-3 w-3" aria-hidden="true" /> Push Notification
              </legend>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Title"
                  aria-label="Notification title"
                  className="w-36 shrink-0 rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-2.5 py-1.5 text-xs text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
                />
                <input
                  type="text"
                  value={notifText}
                  onChange={(e) => setNotifText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void sendNotification(); }}
                  placeholder="Message"
                  aria-label="Notification message"
                  className="min-w-0 flex-1 rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-2.5 py-1.5 text-xs text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
                />
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value as typeof notifType)}
                  aria-label="Notification type"
                  className="rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-2 py-1.5 text-xs text-nd-text outline-none focus:border-nd-accent/40 focus-visible:ring-1 focus-visible:ring-nd-accent/40"
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warn">Warn</option>
                  <option value="error">Error</option>
                </select>
                <button
                  type="button"
                  onClick={() => void sendNotification()}
                  disabled={sendingNotif || !notifTitle.trim() || !notifText.trim()}
                  aria-label="Send notification to remote clients"
                  className="flex items-center gap-1.5 rounded-lg border border-nd-accent/30 bg-nd-accent/10 px-3 py-1.5 text-xs text-nd-accent hover:bg-nd-accent/20 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
                >
                  {sendingNotif ? (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                  ) : (
                    <Send className="h-3 w-3" aria-hidden="true" />
                  )}
                  Send
                </button>
              </div>
              {status.clients === 0 && (
                <p className="text-[11px] text-nd-text-muted/60 italic">No clients connected — notification will not be delivered.</p>
              )}
            </fieldset>
          )}

          {/* Event log */}
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted">Event Log</span>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="rounded px-1 text-[11px] text-nd-text-muted hover:text-nd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
              >
                Clear
              </button>
            </div>
            <div
              role="log"
              aria-live="polite"
              aria-label="Remote control event log"
              className="min-h-0 flex-1 overflow-auto space-y-1"
            >
              {logs.length === 0 && (
                <p className="text-xs text-nd-text-muted/50 italic">No events yet</p>
              )}
              {logs.map((l, i) => (
                <div
                  key={i}
                  className={`text-[11px] font-mono ${
                    l.tone === 'error'
                      ? 'text-nd-danger'
                      : l.tone === 'success'
                        ? 'text-nd-success'
                        : l.tone === 'warn'
                          ? 'text-nd-warning'
                          : 'text-nd-text-muted'
                  }`}
                >
                  [{l.time}] {l.text}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
