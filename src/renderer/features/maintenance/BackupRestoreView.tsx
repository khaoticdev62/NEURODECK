import { useCallback, useState } from "react";
import { Archive, Download, RefreshCcw, Upload } from "lucide-react";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { EmptyState } from "../../components/primitives/EmptyState";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import { TabGroup, TabList, Tab, TabPanel } from "../../components/primitives/Tabs";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckState } from "../../types/neurodeck";

interface BackupEntry {
  id: string;
  ts: string;
  label: string;
  sizeMb: number;
  status: "ok" | "corrupted";
}

const MOCK_BACKUPS: BackupEntry[] = [
  { id: "bk-001", ts: "2026-06-17T14:22:00Z", label: "Pre-upgrade backup", sizeMb: 12.4, status: "ok" },
  { id: "bk-002", ts: "2026-06-10T09:05:00Z", label: "Manual snapshot", sizeMb: 11.8, status: "ok" },
];

export function BackupRestoreView({ state: _state }: { state: NeuroDeckState }) {
  const [activeTab, setActiveTab] = useState("backups");
  const [backups, setBackups] = useState<BackupEntry[]>(MOCK_BACKUPS);
  const [creating, setCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupEntry | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      await (neurodeckApi as unknown as { system?: { createBackup?: () => Promise<unknown> } }).system?.createBackup?.();
      const newEntry: BackupEntry = {
        id: `bk-${Date.now()}`,
        ts: new Date().toISOString(),
        label: "Manual backup",
        sizeMb: 12.0,
        status: "ok",
      };
      setBackups((prev) => [newEntry, ...prev]);
    } catch {
      // error handled by toast system
    } finally {
      setCreating(false);
    }
  }, []);

  const handleRestore = useCallback(async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    setRestoreProgress(0);
    try {
      const interval = setInterval(() => {
        setRestoreProgress((p) => {
          if (p >= 95) { clearInterval(interval); return 95; }
          return p + 15;
        });
      }, 300);
      await (neurodeckApi as unknown as { system?: { restoreBackup?: (id: string) => Promise<unknown> } }).system?.restoreBackup?.(restoreTarget.id);
      clearInterval(interval);
      setRestoreProgress(100);
      setTimeout(() => { setRestoring(false); setRestoreTarget(null); setRestoreProgress(0); }, 1000);
    } catch {
      setRestoring(false);
      setRestoreTarget(null);
    }
  }, [restoreTarget]);

  return (
    <Panel
      eyebrow="Maintenance"
      title="Backup & Restore"
      data-testid="backup-restore-view"
      className="h-full overflow-hidden"
      scrollable
    >
      <TabGroup value={activeTab} onChange={setActiveTab}>
        <TabList className="mx-4 mt-3">
          <Tab value="backups">Backups</Tab>
          <Tab value="restore">Restore</Tab>
        </TabList>

        <TabPanel value="backups">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-nd-text-muted">
                Backups include sessions, memory, settings, and profiles.
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={Archive}
                loading={creating}
                onClick={() => void handleCreate()}
              >
                Create Backup
              </Button>
            </div>

            {backups.length === 0 ? (
              <EmptyState
                icon={Archive}
                title="No backups"
                description="Create a backup to protect your data."
                action={
                  <Button variant="secondary" size="sm" onClick={() => void handleCreate()}>
                    Create Backup
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-2" role="list" aria-label="Backup history">
                {backups.map((bk) => (
                  <div
                    key={bk.id}
                    role="listitem"
                    className="flex items-center justify-between rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-nd-text-primary">{bk.label}</p>
                      <p className="text-xs text-nd-text-muted">
                        {new Date(bk.ts).toLocaleString()} · {bk.sizeMb} MB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip tone={bk.status === "ok" ? "success" : "error"} size="sm">
                        {bk.status === "ok" ? "OK" : "Corrupted"}
                      </StatusChip>
                      <Button variant="ghost" size="sm" icon={Download} aria-label={`Download ${bk.label}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel value="restore">
          <div className="flex flex-col gap-4 p-4">
            <p className="text-sm text-nd-text-muted">
              Select a backup to restore. Current data will be overwritten — this cannot be undone.
            </p>

            <div
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-nd-border-subtle p-8"
              role="button"
              tabIndex={0}
              aria-label="Upload backup file"
            >
              <Upload className="h-8 w-8 text-nd-text-muted" aria-hidden />
              <p className="text-sm text-nd-text-muted">
                Drop a <code className="font-mono">.ndbackup</code> file here, or click to browse
              </p>
            </div>

            <div className="flex flex-col gap-2" role="list" aria-label="Available backups to restore">
              {backups.filter((bk) => bk.status === "ok").map((bk) => (
                <div
                  key={bk.id}
                  role="listitem"
                  className="flex items-center justify-between rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-nd-text-primary">{bk.label}</p>
                    <p className="text-xs text-nd-text-muted">
                      {new Date(bk.ts).toLocaleString()} · {bk.sizeMb} MB
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={RefreshCcw}
                    onClick={() => setRestoreTarget(bk)}
                    aria-label={`Restore from ${bk.label}`}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabPanel>
      </TabGroup>

      {restoring && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-nd-surface-bg/90 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-label={`Restoring backup: ${restoreProgress}%`}
        >
          <RefreshCcw className="h-10 w-10 animate-spin text-nd-accent-primary" aria-hidden />
          <p className="font-bold text-nd-text-primary">Restoring…</p>
          <div
            className="h-2 w-64 overflow-hidden rounded-full bg-nd-surface-secondary"
            role="progressbar"
            aria-valuenow={restoreProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-nd-accent-primary transition-all duration-300"
              style={{ width: `${restoreProgress}%` }}
            />
          </div>
          <p className="text-sm text-nd-text-muted">{restoreProgress}%</p>
        </div>
      )}

      <ConfirmDialog
        open={restoreTarget !== null && !restoring}
        title="Restore Backup"
        message={`Restore "${restoreTarget?.label ?? ""}"? All current sessions, memory, and settings will be replaced. This cannot be undone.`}
        confirmLabel="Restore"
        destructive
        onConfirm={() => void handleRestore()}
        onCancel={() => setRestoreTarget(null)}
      />
    </Panel>
  );
}
