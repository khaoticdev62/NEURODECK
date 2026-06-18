import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCcw, Shield, ShieldOff, Wifi } from "lucide-react";
import { NetworkProfileDrawer } from "./NetworkProfileDrawer";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { Panel } from "../../components/primitives/Panel";
import { Skeleton } from "../../components/primitives/Skeleton";
import { StatusChip } from "../../components/primitives/StatusChip";
import { TabGroup, TabList, Tab, TabPanel } from "../../components/primitives/Tabs";
import { listenBridge, neurodeckApi } from "../../services/bridgeAdapter";
import type { NeuroDeckState } from "../../types/neurodeck";

interface VPNProfile {
  id: string;
  name: string;
  type: "wireguard" | "openvpn";
  endpoint: string;
  status: "connected" | "disconnected" | "error";
}

interface TunnelStatus {
  active: boolean;
  localPort: number;
  remotePort: number;
}

type NetworkApi = {
  getVPNProfiles?: () => Promise<unknown>;
  getTunnelStatus?: () => Promise<unknown>;
  connectVPN?: (id: string) => Promise<unknown>;
  disconnectVPN?: (id: string) => Promise<unknown>;
};

const netApi = () => (neurodeckApi as unknown as { network?: NetworkApi }).network;

export function VPNView({ state: _state }: { state: NeuroDeckState }) {
  const [activeTab, setActiveTab] = useState("profiles");
  const [profiles, setProfiles] = useState<VPNProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tunnel, setTunnel] = useState<TunnelStatus | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await netApi()?.getVPNProfiles?.();
      setProfiles(Array.isArray(result) ? (result as VPNProfile[]) : MOCK_PROFILES);
      const ts = await netApi()?.getTunnelStatus?.();
      setTunnel((ts as TunnelStatus) ?? null);
    } catch {
      setError("Unable to reach network backend.");
      setProfiles(MOCK_PROFILES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const unsub = listenBridge("vpn:connected", (data: unknown) => {
      const { id } = data as { id: string };
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "connected" } : p))
      );
    });
    const unsub2 = listenBridge("vpn:disconnected", (data: unknown) => {
      const { id } = data as { id: string };
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "disconnected" } : p))
      );
    });
    return () => {
      unsub?.();
      unsub2?.();
    };
  }, [loadData]);

  const handleToggle = useCallback(async (profile: VPNProfile) => {
    setToggling(profile.id);
    try {
      if (profile.status === "connected") {
        await netApi()?.disconnectVPN?.(profile.id);
      } else {
        await netApi()?.connectVPN?.(profile.id);
      }
    } catch {
      // event-driven; WebSocket will update state
    } finally {
      setToggling(null);
    }
  }, []);

  return (
    <Panel
      eyebrow="Network"
      title="VPN & Networking"
      data-testid="vpn-view"
      className="h-full overflow-hidden"
      scrollable
      action={
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCcw}
            onClick={() => void loadData()}
            aria-label="Refresh"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => setProfileDrawerOpen(true)}
          >
            Add Profile
          </Button>
        </div>
      }
    >
      <TabGroup value={activeTab} onChange={setActiveTab}>
        <TabList className="mx-4 mt-3">
          <Tab value="profiles">VPN Profiles</Tab>
          <Tab value="tunnel">TCP Tunnel</Tab>
        </TabList>

        <TabPanel value="profiles">
          <div className="flex flex-col gap-4 p-4">
            {error && (
              <ErrorState
                title="Backend unavailable"
                message={error}
                onRetry={() => void loadData()}
                retryLabel="Retry"
              />
            )}

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
              </div>
            ) : profiles.length === 0 ? (
              <EmptyState
                icon={Shield}
                title="No VPN profiles"
                description="Add a WireGuard or OpenVPN profile to get started."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setProfileDrawerOpen(true)}
                  >
                    Add Profile
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3" role="list" aria-label="VPN profiles">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    role="listitem"
                    className="flex items-center justify-between rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                          profile.status === "connected"
                            ? "border-nd-status-success/40 bg-nd-status-success/10 text-nd-status-success"
                            : "border-nd-border-subtle bg-nd-surface-secondary/40 text-nd-text-muted"
                        }`}
                      >
                        {profile.status === "connected" ? (
                          <Shield className="h-4 w-4" aria-hidden />
                        ) : (
                          <ShieldOff className="h-4 w-4" aria-hidden />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-nd-text-primary">{profile.name}</p>
                        <p className="text-xs text-nd-text-muted">
                          {profile.type.toUpperCase()} · {profile.endpoint}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip
                        tone={
                          profile.status === "connected"
                            ? "success"
                            : profile.status === "error"
                            ? "error"
                            : "info"
                        }
                        size="sm"
                      >
                        {profile.status}
                      </StatusChip>
                      <Button
                        variant={profile.status === "connected" ? "danger" : "secondary"}
                        size="sm"
                        loading={toggling === profile.id}
                        onClick={() => void handleToggle(profile)}
                        aria-label={
                          profile.status === "connected"
                            ? `Disconnect ${profile.name}`
                            : `Connect ${profile.name}`
                        }
                      >
                        {profile.status === "connected" ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel value="tunnel">
          <div className="flex flex-col gap-4 p-4">
            <div className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/20 p-4">
              <h2 className="font-bold text-nd-text-primary">TCP Loopback Tunnel</h2>
              <p className="mt-1 text-sm text-nd-text-muted">
                Bridges SteamOS Game Mode to Desktop Mode. Used for IPC when Steam is active.
              </p>
              {tunnel ? (
                <div className="mt-3 flex gap-4 text-sm">
                  <span className="text-nd-text-muted">
                    Local:{" "}
                    <span className="font-mono text-nd-text-primary">{tunnel.localPort}</span>
                  </span>
                  <span className="text-nd-text-muted">
                    Remote:{" "}
                    <span className="font-mono text-nd-text-primary">{tunnel.remotePort}</span>
                  </span>
                  <StatusChip tone={tunnel.active ? "success" : "info"} size="sm">
                    {tunnel.active ? "Active" : "Inactive"}
                  </StatusChip>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-sm text-nd-text-muted">
                  <Wifi className="h-4 w-4" aria-hidden />
                  No tunnel status available.
                </div>
              )}
            </div>
          </div>
        </TabPanel>
      </TabGroup>

      <NetworkProfileDrawer
        open={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        onSaved={() => void loadData()}
      />
    </Panel>
  );
}

const MOCK_PROFILES: VPNProfile[] = [
  {
    id: "wg-home",
    name: "Home WireGuard",
    type: "wireguard",
    endpoint: "home.example.com:51820",
    status: "disconnected",
  },
  {
    id: "ovpn-work",
    name: "Work OpenVPN",
    type: "openvpn",
    endpoint: "vpn.work.internal:1194",
    status: "disconnected",
  },
];
