import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCcw, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { Panel } from "../../components/primitives/Panel";
import { Skeleton } from "../../components/primitives/Skeleton";
import { StatusChip } from "../../components/primitives/StatusChip";
import type { NeuroDeckState } from "../../types/neurodeck";

type PermStatus = "granted" | "denied" | "unknown";

interface OsPermission {
  id: string;
  label: string;
  description: string;
  status: PermStatus;
  required: boolean;
  requestable: boolean;
}

const STATUS_ICON: Record<PermStatus, React.ElementType> = {
  granted: CheckCircle2,
  denied: XCircle,
  unknown: AlertTriangle,
};

const STATUS_TONE: Record<PermStatus, "success" | "error" | "warning"> = {
  granted: "success",
  denied: "error",
  unknown: "warning",
};

const MOCK_PERMISSIONS: OsPermission[] = [
  {
    id: "microphone",
    label: "Microphone",
    description: "Voice STT (stop_recording command). Required for voice input.",
    status: "unknown",
    required: false,
    requestable: true,
  },
  {
    id: "camera",
    label: "Camera",
    description: "Computer-use tool screenshot capture.",
    status: "unknown",
    required: false,
    requestable: true,
  },
  {
    id: "filesystem",
    label: "Filesystem (user_config_dir)",
    description: "Read/write sessions, memory, and config under %APPDATA%\\neurodeck.",
    status: "granted",
    required: true,
    requestable: false,
  },
  {
    id: "network",
    label: "Network Access",
    description: "IPC bridge (localhost:9477), Gemini API, Ollama.",
    status: "granted",
    required: true,
    requestable: false,
  },
  {
    id: "pty",
    label: "PTY / Shell",
    description: "Spawn terminal sessions via portable-pty.",
    status: "granted",
    required: true,
    requestable: false,
  },
];

export function PermissionsView({ state: _state }: { state: NeuroDeckState }) {
  const [permissions, setPermissions] = useState<OsPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setPermissions(MOCK_PERMISSIONS);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRequest = useCallback(async (permId: string) => {
    setRequesting(permId);
    await new Promise((r) => setTimeout(r, 800));
    setPermissions((prev) =>
      prev.map((p) => (p.id === permId ? { ...p, status: "granted" } : p))
    );
    setRequesting(null);
  }, []);

  return (
    <Panel
      eyebrow="Security"
      title="OS Permissions"
      data-testid="permissions-view"
      className="h-full overflow-hidden"
      scrollable
      action={
        <Button variant="ghost" size="sm" icon={RefreshCcw} onClick={() => void load()} aria-label="Refresh permissions" />
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-nd-text-muted">
          These are OS-level permissions NEURODECK uses. Denied permissions may disable features.
        </p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2" role="list" aria-label="OS permissions">
            {permissions.map((perm) => {
              const Icon = STATUS_ICON[perm.status];
              return (
                <div
                  key={perm.id}
                  role="listitem"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-4 py-3"
                  aria-label={`${perm.label}: ${perm.status}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        perm.status === "granted"
                          ? "text-nd-status-success"
                          : perm.status === "denied"
                          ? "text-nd-status-error"
                          : "text-nd-warning"
                      }`}
                      aria-hidden
                    />
                    <div>
                      <p className="font-medium text-nd-text-primary">
                        {perm.label}
                        {perm.required && (
                          <span className="ml-2 text-xs text-nd-status-error">Required</span>
                        )}
                      </p>
                      <p className="text-xs text-nd-text-muted">{perm.description}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusChip tone={STATUS_TONE[perm.status]} size="sm">
                      {perm.status}
                    </StatusChip>
                    {perm.requestable && perm.status !== "granted" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={requesting === perm.id}
                        onClick={() => void handleRequest(perm.id)}
                        aria-label={`Request ${perm.label} permission`}
                      >
                        Request
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
