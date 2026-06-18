import { useCallback, useEffect, useState } from "react";
import { IdCard, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "../../../components/primitives/EmptyState";
import { Button } from "../../../components/primitives/Button";
import { IconButton } from "../../../components/primitives/IconButton";
import { Panel } from "../../../components/primitives/Panel";
import { Select } from "../../../components/primitives/Select";
import { TextInput } from "../../../components/primitives/TextInput";
import { Toggle } from "../../../components/primitives/Toggle";
import { Badge } from "../../../components/primitives/Badge";
import { neurodeckApi } from "../../../services/bridgeAdapter";
import type { SyncProfile, TrustedPeer } from "../../../services/bridgeAdapter";

const MODE_OPTIONS: { value: SyncProfile["mode"]; label: string }[] = [
  { value: "lan", label: "LAN" },
  { value: "vpn_manual", label: "VPN Manual" },
  { value: "vpn_mesh", label: "VPN Mesh" },
  { value: "hybrid", label: "Hybrid" },
  { value: "receive_only", label: "Receive Only" },
  { value: "send_only", label: "Send Only" },
];

interface Props {
  groupCode: string;
  inboxPath: string;
  trustedPeers: TrustedPeer[];
  onError: (msg: string) => void;
}

export function ProfilesTab({ groupCode, inboxPath, trustedPeers, onError }: Props) {
  const [profiles, setProfiles] = useState<SyncProfile[]>([]);
  const [name, setName] = useState("Home LAN");
  const [mode, setMode] = useState<SyncProfile["mode"]>("lan");
  const [vpnOnly, setVpnOnly] = useState(false);
  const [autoAcceptTrusted, setAutoAcceptTrusted] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshProfiles = useCallback(async () => {
    try {
      const res = await neurodeckApi.transfer.profiles("list");
      setProfiles(res.profiles ?? []);
    } catch (e) {
      onError(`Profile load failed: ${e}`);
    }
  }, [onError]);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await neurodeckApi.transfer.profiles("add", {
        name: name.trim(),
        mode,
        enabled: true,
        preferred_interface: vpnOnly ? "vpn-auto" : "auto",
        incoming_folder: inboxPath,
        auto_accept_trusted: autoAcceptTrusted,
        compression: "auto",
        vpn_only: vpnOnly,
      });
      setName("");
      await refreshProfiles();
    } catch (e) {
      onError(`Profile save failed: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await neurodeckApi.transfer.profiles("remove", { id });
      await refreshProfiles();
    } catch (e) {
      onError(`Profile remove failed: ${e}`);
    }
  };

  return (
    <Panel eyebrow="Profiles" title="Sync Profiles" className="h-full">
      <div className="flex h-full flex-col gap-4 overflow-y-auto">
        <section
          aria-label="Create sync profile"
          className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4"
        >
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
            Create Profile
          </h3>
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto] lg:items-end">
            <TextInput
              label="Profile name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Home LAN"
              fullWidth
            />
            <Select
              label="Mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as SyncProfile["mode"])}
              options={MODE_OPTIONS}
              fullWidth
            />
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={Plus}
              loading={saving}
              disabled={saving || !name.trim()}
              onClick={() => void handleAdd()}
            >
              Save
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-6 text-xs text-nd-text-secondary">
            <Toggle
              checked={vpnOnly}
              onChange={() => setVpnOnly((v) => !v)}
              label="VPN-only lock"
            />
            <Toggle
              checked={autoAcceptTrusted}
              onChange={() => setAutoAcceptTrusted((v) => !v)}
              label="Auto-accept trusted peers"
            />
          </div>
        </section>

        <section aria-label="Saved sync profiles" className="min-h-0 flex-1">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
              Saved Profiles
            </h3>
            <span className="text-xs text-nd-text-muted">
              {trustedPeers.length} trusted peers · group {groupCode ? "set" : "default"}
            </span>
          </div>
          {profiles.length === 0 ? (
            <EmptyState
              icon={IdCard}
              title="No profiles saved"
              description="Save LAN, VPN, receive-only, or travel profiles here."
              compact
            />
          ) : (
            <ul role="list" className="grid gap-2 lg:grid-cols-2">
              {profiles.map((profile) => (
                <li
                  key={profile.id}
                  className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-4 transition-colors duration-fast hover:border-nd-accent-primary/25"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/60">
                      <IdCard className="h-4 w-4 text-nd-accent-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-nd-text-primary">
                        {profile.name}
                      </p>
                      <p className="mt-1 text-xs text-nd-text-muted">
                        {profile.mode.replace("_", " ")} ·{" "}
                        {profile.vpn_only ? "VPN-only" : "LAN allowed"} ·{" "}
                        {profile.auto_accept_trusted ? "trusted auto-accept" : "manual accept"}
                      </p>
                      <p className="mt-1 break-all font-mono text-[11px] text-nd-text-muted">
                        {profile.incoming_folder}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone="accent" variant="outline" size="sm">
                          {profile.mode.replace("_", " ")}
                        </Badge>
                        {profile.vpn_only && (
                          <Badge tone="warning" variant="outline" size="sm">
                            VPN-only
                          </Badge>
                        )}
                        {profile.auto_accept_trusted && (
                          <Badge tone="success" variant="outline" size="sm">
                            Auto-accept
                          </Badge>
                        )}
                      </div>
                    </div>
                    <IconButton
                      type="button"
                      size="md"
                      variant="danger"
                      aria-label={`Remove profile ${profile.name}`}
                      onClick={() => void handleRemove(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Panel>
  );
}
