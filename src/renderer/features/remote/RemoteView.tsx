import { useCallback, useEffect, useRef, useState } from "react";
import { Power, PowerOff, Copy, Users, Clock, Bell, Send } from "lucide-react";
import QRCode from "qrcode";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { IconButton } from "../../components/primitives/IconButton";
import { ErrorState } from "../../components/primitives/ErrorState";
import { Panel } from "../../components/primitives/Panel";
import { Select } from "../../components/primitives/Select";

import { TextInput } from "../../components/primitives/TextInput";
import { neurodeckApi } from "../../services/bridgeAdapter";

interface LogEntry {
  text: string;
  tone: "info" | "success" | "warn" | "error";
  time: string;
}

const NOTIF_TYPES = [
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
];

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
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifText, setNotifText] = useState("");
  const [notifType, setNotifType] = useState<"info" | "success" | "warn" | "error">("info");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const ttlTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const log = useCallback((text: string, tone: LogEntry["tone"] = "info") => {
    setLogs((prev) => [
      ...prev.slice(-199),
      { text, tone, time: new Date().toLocaleTimeString("en-US", { hour12: false }) },
    ]);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const info = await neurodeckApi.remote.getInfo();
      setStatus(info);
      if (info.running && info.ttl_seconds_remaining != null) {
        setTtl((prev) => {
          if (Math.abs(prev - info.ttl_seconds_remaining!) > 5) {
            return info.ttl_seconds_remaining!;
          }
          return prev;
        });
      }
      setLoadError(null);
    } catch (e) {
      setLoadError(String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (status.running && status.url) {
      const accentColor =
        getComputedStyle(document.documentElement).getPropertyValue("--nd-accent-primary").trim() ||
        "#5EEBFF";
      const bgColor =
        getComputedStyle(document.documentElement).getPropertyValue("--nd-surface-app").trim() ||
        "#0A0D10";
      QRCode.toDataURL(status.url, {
        width: 160,
        margin: 1,
        color: { dark: accentColor, light: bgColor },
      })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(""));
    } else {
      setQrDataUrl("");
    }
  }, [status.running, status.url]);

  useEffect(() => {
    if (status.running && ttl > 0) {
      if (ttlTimer.current) clearInterval(ttlTimer.current);
      ttlTimer.current = setInterval(() => {
        setTtl((prev) => {
          if (prev <= 1) {
            if (ttlTimer.current) clearInterval(ttlTimer.current);
            log("Session token expired. Restart the server to refresh.", "warn");
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

  useEffect(() => {
    if (logs.length > 0) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [logs]);

  useEffect(() => {
    const unsubConnect = neurodeckApi.remote.onClientConnected((count) => {
      log(`Client connected (${count} total)`, "success");
      setStatus((s) => ({ ...s, clients: count }));
    });
    const unsubDisconnect = neurodeckApi.remote.onClientDisconnected((count) => {
      log(`Client disconnected (${count} remaining)`, "warn");
      setStatus((s) => ({ ...s, clients: count }));
    });
    const unsubChat = neurodeckApi.remote.onChat((text) => {
      log(`Remote chat: ${String(text).slice(0, 80)}`, "info");
    });
    const unsubNav = neurodeckApi.remote.onNavigate((view) => {
      log(`Remote navigate → ${view}`, "info");
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
    setActionError(null);
    try {
      if (status.running) {
        await neurodeckApi.remote.stop();
        setTtl(0);
        log("Server stopped.", "warn");
      } else {
        const info = await neurodeckApi.remote.start(port);
        log(`Server started: ${info.url ?? ""}`, "success");
        log(`PIN: ${info.pin ?? ""}`, "success");
      }
      await refresh();
    } catch (err) {
      setActionError(String(err));
      log(`Failed: ${err}`, "error");
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
      if (res.status === "relayed") {
        log(`Notification relayed: "${notifTitle}"`, "success");
        setNotifTitle("");
        setNotifText("");
      } else {
        log("No remote clients connected — notification not delivered.", "warn");
      }
    } catch (err) {
      log(`Notification failed: ${err}`, "error");
    } finally {
      setSendingNotif(false);
    }
  };

  const formatTtl = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <Panel eyebrow="Remote" title="Remote Control" className="flex h-full flex-col">
      <div data-testid="remote-view" className="flex min-h-0 flex-1 gap-3 p-4">
        {/* Main panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-auto rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-4 scrollbar-thin">
          {loadError && (
            <ErrorState
              title="Failed to load remote status"
              message={loadError}
              onRetry={() => void refresh()}
              onClose={() => setLoadError(null)}
            />
          )}
          {actionError && (
            <ErrorState
              title="Server action failed"
              message={actionError}
              onClose={() => setActionError(null)}
            />
          )}
          {/* Status card */}
          <div
            data-testid="remote-status-badge"
            className="flex items-center gap-4 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-4"
          >
            <div
              className={`h-3 w-3 rounded-full ${
                status.running
                  ? "bg-nd-accent-success shadow-[0_0_8px_rgba(var(--nd-green-rgb),0.5)]"
                  : "bg-nd-text-muted/40"
              }`}
            />
            <span className="text-sm font-medium text-nd-text-primary/90">
              {status.running ? "Server Running" : "Server Offline"}
            </span>
            {status.clients !== undefined && status.running && (
              <Badge tone="accent" size="sm" className="ml-auto">
                <Users className="mr-1 inline h-3 w-3" aria-hidden="true" />
                {status.clients} client{status.clients === 1 ? "" : "s"}
              </Badge>
            )}
          </div>

          {/* Port + Toggle */}
          <div className="flex flex-wrap items-end gap-3">
            <TextInput
              id="remote-port"
              label="Server Port"
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              disabled={status.running || loading}
              className="w-32"
            />
            <Button
              variant={status.running ? "danger" : "success"}
              size="md"
              icon={status.running ? PowerOff : Power}
              onClick={() => void toggle()}
              loading={loading}
            >
              {status.running ? "Stop Server" : "Start Server"}
            </Button>
          </div>

          {/* QR + URL */}
          {status.running && status.url && (
            <div className="flex flex-col gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-4 sm:flex-row sm:items-center">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="Remote control QR code — scan to connect"
                  className="h-40 w-40 rounded-lg border border-nd-border-subtle"
                />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-nd-text-muted">Remote URL</span>
                  <IconButton
                    aria-label="Copy remote URL"
                    variant="subtle"
                    size="sm"
                    onClick={copyUrl}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </div>
                <p className="break-all font-mono text-sm text-nd-text-primary/80">{status.url}</p>
                {status.pin && (
                  <div className="flex items-center gap-2 text-xs text-nd-text-muted">
                    <span>PIN:</span>
                    <span className="rounded-md bg-nd-surface-app px-2 py-0.5 font-mono text-nd-accent-primary">
                      {status.pin}
                    </span>
                  </div>
                )}
                {ttl > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-nd-text-muted">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className={ttl < 120 ? "text-nd-accent-error" : ""}>
                      Session expires in {formatTtl(ttl)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notification relay */}
          {status.running && (
            <fieldset className="space-y-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-4">
              <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted">
                <Bell className="h-3 w-3" aria-hidden="true" /> Push Notification
              </legend>
              <div className="flex flex-wrap gap-2">
                <TextInput
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="Title"
                  aria-label="Notification title"
                  className="w-36 shrink-0"
                />
                <TextInput
                  value={notifText}
                  onChange={(e) => setNotifText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void sendNotification();
                  }}
                  placeholder="Message"
                  aria-label="Notification message"
                  fullWidth
                  className="min-w-0 flex-1"
                />
                <Select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value as typeof notifType)}
                  aria-label="Notification type"
                  options={NOTIF_TYPES}
                  className="w-28 shrink-0"
                />
                <Button
                  variant="primary"
                  size="md"
                  icon={Send}
                  onClick={() => void sendNotification()}
                  loading={sendingNotif}
                  disabled={!notifTitle.trim() || !notifText.trim()}
                >
                  Send
                </Button>
              </div>
              {status.clients === 0 && (
                <p className="text-[11px] italic text-nd-text-muted/60">
                  No clients connected — notification will not be delivered.
                </p>
              )}
            </fieldset>
          )}

          {/* Event log */}
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-nd-text-muted">
                Event Log
              </span>
              <Button variant="ghost" size="xs" onClick={() => setLogs([])}>
                Clear
              </Button>
            </div>
            <div
              role="log"
              aria-live="polite"
              aria-label="Remote control event log"
              className="min-h-0 flex-1 space-y-1 overflow-auto"
            >
              {logs.length === 0 && (
                <p className="text-xs text-nd-text-muted/50 italic">No events yet</p>
              )}
              {logs.map((l, i) => (
                <div
                  key={i}
                  className={`text-[11px] font-mono ${
                    l.tone === "error"
                      ? "text-nd-accent-error"
                      : l.tone === "success"
                        ? "text-nd-accent-success"
                        : l.tone === "warn"
                          ? "text-nd-accent-warning"
                          : "text-nd-text-muted"
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
    </Panel>
  );
}
