import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCcw,
  LayoutDashboard,
  Laptop,
  Send as SendIcon,
  Inbox,
  Clock,
  Activity,
  Settings,
  ListChecks,
  IdCard,
  Network,
  X,
} from 'lucide-react';
import { neurodeckApi, listenBridge } from '../../services/bridgeAdapter';
import type { FileTransfer, TransferPeer, TrustedPeer } from '../../services/bridgeAdapter';
import { ConfirmDialog } from '../../components/primitives/ConfirmDialog';
import { IconButton } from '../../components/primitives/IconButton';
import { DeckButtonHint } from '../../components/primitives/DeckButtonHint';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '../../components/primitives/Tabs';
import { DashboardTab } from './tabs/DashboardTab';
import { DevicesTab } from './tabs/DevicesTab';
import { SendTab } from './tabs/SendTab';
import { InboxTab } from './tabs/InboxTab';
import { QueueTab } from './tabs/QueueTab';
import { HistoryTab } from './tabs/HistoryTab';
import { ProfilesTab } from './tabs/ProfilesTab';
import { VpnWanTab } from './tabs/VpnWanTab';
import { DiagnosticsTab } from './tabs/DiagnosticsTab';
import { SettingsTab } from './tabs/SettingsTab';

type TabId = 'dashboard' | 'devices' | 'send' | 'inbox' | 'queue' | 'history' | 'profiles' | 'vpn' | 'diagnostics' | 'settings';

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'devices', label: 'Devices', icon: Laptop },
  { id: 'send', label: 'Send', icon: SendIcon },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'queue', label: 'Queue', icon: ListChecks },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'profiles', label: 'Profiles', icon: IdCard },
  { id: 'vpn', label: 'VPN/WAN', icon: Network },
  { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function SyncView() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [peers, setPeers] = useState<TransferPeer[]>([]);
  const [trustedPeers, setTrustedPeers] = useState<TrustedPeer[]>([]);
  const [groupCode, setGroupCode] = useState('');
  const [inboxPath, setInboxPath] = useState('');
  const [incomingRequest, setIncomingRequest] = useState<FileTransfer | null>(null);
  const [mutateError, setMutateError] = useState<string | null>(null);
  const [sendToPreselect, setSendToPreselect] = useState<TransferPeer | null>(null);

  const refreshTransfers = useCallback(async () => {
    try {
      const list = await neurodeckApi.transfer.listActive();
      setTransfers(list);
    } catch {
      // non-critical; WebSocket events will update state
    }
  }, []);

  const refreshPeers = useCallback(async () => {
    try {
      const list = await neurodeckApi.transfer.listPeers();
      setPeers(list);
    } catch {
      // non-critical
    }
  }, []);

  const refreshTrusted = useCallback(async () => {
    try {
      const res = await neurodeckApi.transfer.trustedPeers('list');
      setTrustedPeers(res.peers ?? []);
    } catch {
      // non-critical
    }
  }, []);

  // Initial load
  useEffect(() => {
    void refreshTransfers();
    void refreshPeers();
    void refreshTrusted();

    neurodeckApi.transfer.groupCode('get').then((r) => {
      setGroupCode(r.code ?? '');
    }).catch(() => {});

    neurodeckApi.transfer.getInboxPath().then((r) => {
      setInboxPath(r.path ?? '');
    }).catch(() => {});
  }, [refreshTransfers, refreshPeers, refreshTrusted]);

  // WebSocket event subscriptions
  useEffect(() => {
    const unsubIncoming = listenBridge('transfer_incoming', (payload) => {
      const data = payload as FileTransfer;
      setIncomingRequest(data);
      setTransfers((prev) => {
        const existing = prev.findIndex((t) => t.id === data.id);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = data;
          return next;
        }
        return [data, ...prev];
      });
    });

    const unsubProgress = listenBridge('transfer_progress', (payload) => {
      const data = normalizeProgressEvent(payload);
      setTransfers((prev) =>
        prev.map((t) => (t.id === data.id ? { ...t, progress: data.progress, status: 'Transferring' } : t))
      );
    });

    const unsubCompleted = listenBridge('transfer_completed', (payload) => {
      const data = normalizeTransferIdEvent(payload);
      setTransfers((prev) =>
        prev.map((t) => (t.id === data.id ? { ...t, status: 'Completed', progress: t.size } : t))
      );
    });

    const unsubFailed = listenBridge('transfer_failed', (payload) => {
      const data = normalizeTransferIdEvent(payload);
      setTransfers((prev) =>
        prev.map((t) => (t.id === data.id ? { ...t, status: 'Failed' } : t))
      );
    });

    const unsubCancelled = listenBridge('transfer_cancelled', (payload) => {
      const data = payload as { id: string };
      setTransfers((prev) =>
        prev.map((t) => (t.id === data.id ? { ...t, status: 'Cancelled' } : t))
      );
    });

    const unsubPeers = listenBridge('peers_updated', () => {
      void refreshPeers();
    });

    return () => {
      unsubIncoming();
      unsubProgress();
      unsubCompleted();
      unsubFailed();
      unsubCancelled();
      unsubPeers();
    };
  }, [refreshPeers]);

  // Tab keyboard navigation (L1/R1)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '[' || (e.key === 'q' && e.ctrlKey)) {
        setActiveTab((cur) => {
          const idx = TABS.findIndex((t) => t.id === cur);
          return TABS[Math.max(0, idx - 1)].id;
        });
      }
      if (e.key === ']' || (e.key === 'e' && e.ctrlKey)) {
        setActiveTab((cur) => {
          const idx = TABS.findIndex((t) => t.id === cur);
          return TABS[Math.min(TABS.length - 1, idx + 1)].id;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleCancel = async (id: string) => {
    try {
      await neurodeckApi.transfer.cancel(id);
    } catch (e) {
      setMutateError(`Cancel failed: ${e}`);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await neurodeckApi.transfer.retry(id);
      void refreshTransfers();
    } catch (e) {
      setMutateError(`Retry failed: ${e}`);
    }
  };

  const handleAccept = async () => {
    if (!incomingRequest) return;
    try {
      await neurodeckApi.transfer.respond(incomingRequest.id, true);
    } catch (e) {
      setMutateError(`Accept failed: ${e}`);
    }
    setIncomingRequest(null);
  };

  const handleReject = async () => {
    if (!incomingRequest) return;
    try {
      await neurodeckApi.transfer.respond(incomingRequest.id, false);
    } catch (e) {
      setMutateError(`Reject failed: ${e}`);
    }
    setIncomingRequest(null);
  };

  const handleSendToPeer = (peer: TransferPeer) => {
    setSendToPreselect(peer);
    setActiveTab('send');
  };

  return (
    <div data-testid="sync-view" className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-nd-accent-primary/20 bg-nd-accent-primary/10">
          <RefreshCcw className="h-5 w-5 text-nd-accent-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-nd-text-muted">Sync</p>
          <h2 className="text-lg font-semibold text-nd-text-primary">NEURODECK Sync</h2>
          <p className="text-xs text-nd-text-muted">LAN file transfer — Warpinator/Winpinator compatible</p>
        </div>
        <div className="flex items-center gap-1.5">
          <DeckButtonHint button="L1" label="Prev tab" />
          <DeckButtonHint button="R1" label="Next tab" />
        </div>
      </div>

      {/* Mutate error */}
      {mutateError && (
        <div
          role="alert"
          className="mb-3 flex items-center gap-2 rounded-xl border border-nd-accent-error/25 bg-nd-accent-error/10 px-3 py-2 text-xs text-nd-accent-error"
        >
          {mutateError}
          <IconButton
            aria-label="Dismiss error"
            variant="ghost"
            size="sm"
            className="ml-auto text-nd-accent-error/70 hover:text-nd-accent-error"
            onClick={() => setMutateError(null)}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </IconButton>
        </div>
      )}

      {/* Tabs */}
      <TabGroup value={activeTab} onChange={(v) => setActiveTab(v as TabId)} className="flex min-h-0 flex-1 flex-col">
        <TabList
          aria-label="Sync sections"
          className="mb-3"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tab key={tab.id} value={tab.id} className="gap-1.5 px-3 py-1.5 text-xs">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {tab.label}
              </Tab>
            );
          })}
        </TabList>

        <TabPanels className="min-h-0 flex-1">
          <TabPanel value="dashboard" className="h-full">
            <DashboardTab
              transfers={transfers}
              peers={peers}
              onCancel={(id) => void handleCancel(id)}
              onRetry={(id) => void handleRetry(id)}
              onRefresh={() => { void refreshTransfers(); void refreshPeers(); }}
            />
          </TabPanel>
          <TabPanel value="devices" className="h-full">
            <DevicesTab
              peers={peers}
              trustedPeers={trustedPeers}
              onSendToPeer={handleSendToPeer}
              onRefreshTrusted={() => void refreshTrusted()}
              onError={setMutateError}
            />
          </TabPanel>
          <TabPanel value="send" className="h-full">
            <SendTab
              peers={sendToPreselect ? [sendToPreselect, ...peers.filter((p) => p.ip !== sendToPreselect.ip)] : peers}
              onSuccess={() => {
                setSendToPreselect(null);
                void refreshTransfers();
                setMutateError(null);
                setActiveTab('dashboard');
              }}
              onError={setMutateError}
            />
          </TabPanel>
          <TabPanel value="inbox" className="h-full">
            <InboxTab transfers={transfers} inboxPath={inboxPath} />
          </TabPanel>
          <TabPanel value="queue" className="h-full">
            <QueueTab
              transfers={transfers}
              onCancel={(id) => void handleCancel(id)}
              onRetry={(id) => void handleRetry(id)}
              onClearDone={() => void refreshTransfers()}
              onError={setMutateError}
            />
          </TabPanel>
          <TabPanel value="history" className="h-full">
            <HistoryTab
              transfers={transfers}
              onRetry={(id) => void handleRetry(id)}
              onClearDone={() => void refreshTransfers()}
            />
          </TabPanel>
          <TabPanel value="profiles" className="h-full">
            <ProfilesTab
              groupCode={groupCode}
              inboxPath={inboxPath}
              trustedPeers={trustedPeers}
              onError={setMutateError}
            />
          </TabPanel>
          <TabPanel value="vpn" className="h-full">
            <VpnWanTab
              peers={peers}
              onSendToPeer={handleSendToPeer}
              onPeerAdded={() => void refreshPeers()}
              onError={setMutateError}
            />
          </TabPanel>
          <TabPanel value="diagnostics" className="h-full">
            <DiagnosticsTab />
          </TabPanel>
          <TabPanel value="settings" className="h-full">
            <SettingsTab
              groupCode={groupCode}
              inboxPath={inboxPath}
              onGroupCodeChange={setGroupCode}
              onError={setMutateError}
            />
          </TabPanel>
        </TabPanels>
      </TabGroup>

      {/* Incoming transfer confirm dialog — mounted at root so it's always accessible */}
      <ConfirmDialog
        open={incomingRequest !== null}
        title={`Incoming file from ${incomingRequest?.peer_name || incomingRequest?.peer_ip || 'unknown peer'}`}
        message={`"${incomingRequest?.filename ?? ''}" (${
          incomingRequest ? formatBytes(incomingRequest.size) : ''
        }). Accept this transfer?`}
        confirmLabel="Accept"
        cancelLabel="Reject"
        onConfirm={() => void handleAccept()}
        onCancel={() => void handleReject()}
      />
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

function normalizeTransferIdEvent(payload: unknown): { id: string } {
  if (typeof payload === 'string') return { id: payload };
  if (Array.isArray(payload) && typeof payload[0] === 'string') return { id: payload[0] };
  if (payload && typeof payload === 'object' && 'id' in payload) {
    return { id: String((payload as { id: unknown }).id) };
  }
  return { id: '' };
}

function normalizeProgressEvent(payload: unknown): { id: string; progress: number } {
  if (Array.isArray(payload)) {
    return { id: String(payload[0] ?? ''), progress: Number(payload[1] ?? 0) };
  }
  if (payload && typeof payload === 'object') {
    const data = payload as { id?: unknown; transfer_id?: unknown; progress?: unknown };
    return {
      id: String(data.id ?? data.transfer_id ?? ''),
      progress: Number(data.progress ?? 0),
    };
  }
  return { id: '', progress: 0 };
}
