import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCcw, Shield, X, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { EmptyState } from "../../components/primitives/EmptyState";
import { IconButton } from "../../components/primitives/IconButton";
import { Panel } from "../../components/primitives/Panel";
import { StatusChip } from "../../components/primitives/StatusChip";
import { Toggle } from "../../components/primitives/Toggle";
import type { VpnConfigTemplate } from "../../../../../src/shared/browser-vpn/vpnConfigTemplates";
import type { VpnConnectionEvidence, VpnDiagnosticsReport, VpnProviderSupport } from "../../../../../src/shared/browser-vpn/vpnDiagnosticsTypes";
import type { VpnProfile } from "../../../../../src/shared/browser-vpn/vpnProfileTypes";

type VpnImportKind = "openvpn" | "wireguard" | "proxy" | "external";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type BrowserVpnApi = NonNullable<NonNullable<Window["neurodeck"]>["vpn"]>;

function stateLabel(value: string) {
  return value.replaceAll("_", " ");
}

function statusTone(status: string): "success" | "warning" | "error" | "info" {
  const s = status.toLowerCase();
  if (s.includes("connect") || s.includes("up") || s.includes("passed")) return "success";
  if (s.includes("fail") || s.includes("error") || s.includes("down")) return "error";
  if (s.includes("warn") || s.includes("recover") || s.includes("repair")) return "warning";
  return "info";
}

function badgeTone(status: string): "success" | "warning" | "danger" | "accent" {
  const tone = statusTone(status);
  if (tone === "info") return "accent";
  if (tone === "error") return "danger";
  return tone;
}

export function BrowserVpnPanel({ visible, onClose }: Props) {
  const api = window.neurodeck?.vpn as BrowserVpnApi | undefined;
  const [profiles, setProfiles] = useState<VpnProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<VpnConfigTemplate[]>([]);
  const [providers, setProviders] = useState<VpnProviderSupport[]>([]);
  const [diagnostics, setDiagnostics] = useState<VpnDiagnosticsReport | null>(null);
  const [evidence, setEvidence] = useState<VpnConnectionEvidence[]>([]);
  const [configText, setConfigText] = useState("");
  const [busy, setBusy] = useState(false);
  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === selectedProfileId) ?? null, [profiles, selectedProfileId]);

  const refresh = async () => {
    if (!api) return;
    setBusy(true);
    try {
      const [nextProfiles, nextTemplates, nextProviders, nextEvents] = await Promise.all([
        api.listProfiles(),
        api.listTemplates(),
        api.getProviderMatrix(),
        api.getRecoveryEvents(),
      ]);
      setProfiles(nextProfiles as VpnProfile[]);
      setTemplates(nextTemplates as VpnConfigTemplate[]);
      setProviders(nextProviders as VpnProviderSupport[]);
      const nextProfileId = selectedProfileId ?? (nextProfiles[0] as VpnProfile | undefined)?.id ?? null;
      setSelectedProfileId(nextProfileId);
      if (nextProfileId) {
        const [nextDiagnostics, nextEvidence] = await Promise.all([api.getStatus(nextProfileId), api.getEvidence(nextProfileId)]);
        setDiagnostics(nextDiagnostics as VpnDiagnosticsReport);
        setEvidence(nextEvidence as VpnConnectionEvidence[]);
      }
      void nextEvents;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (visible) void refresh();
  }, [visible]);

  if (!visible) return null;

  const importTemplate = async (template: VpnConfigTemplate) => {
    if (!api) return;
    setConfigText(template.configText);
    await api.importConfig(template.configText, template.routeMode as VpnImportKind);
    await refresh();
  };

  const saveProfile = async () => {
    if (!api || !selectedProfile) return;
    setBusy(true);
    try {
      await api.updateProfile(selectedProfile);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const connect = async () => {
    if (!api || !selectedProfile) return;
    setBusy(true);
    try {
      await api.connect(selectedProfile.id, selectedProfile.browserProfileIds[0]);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!api || !selectedProfile) return;
    setBusy(true);
    try {
      await api.disconnect(selectedProfile.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!api || !selectedProfile) return;
    setBusy(true);
    try {
      await api.verify(selectedProfile.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const repair = async () => {
    if (!api || !selectedProfile) return;
    setBusy(true);
    try {
      await api.repair(selectedProfile.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const setKillSwitch = async (enabled: boolean) => {
    if (!api || !selectedProfile) return;
    setBusy(true);
    try {
      await api.setKillSwitch(selectedProfile.id, enabled);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full w-full max-w-[1180px] flex-col overflow-hidden rounded-3xl border border-nd-border-subtle bg-nd-surface-app/96 shadow-2xl">
      <Panel
        eyebrow="Secure Routes"
        title="Browser VPN"
        className="h-full rounded-none border-0 bg-transparent shadow-none"
        action={
          <div className="flex items-center gap-2">
            <IconButton
              aria-label="Refresh VPN status"
              variant="subtle"
              size="md"
              onClick={() => void refresh()}
              disabled={busy}
            >
              <RefreshCcw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
            </IconButton>
            <IconButton aria-label="Close VPN panel" variant="subtle" size="md" onClick={onClose}>
              <X className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </div>
        }
      >
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-4 xl:grid-cols-[260px_1fr_320px]">
          {/* Profiles */}
          <section className="flex min-h-0 flex-col gap-2 overflow-auto rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-3">
            {profiles.length === 0 ? (
              <EmptyState
                icon={Shield}
                title="No VPN profiles yet"
                description="Import a route template to create the first browser VPN profile."
                compact
                className="rounded-xl border border-dashed border-nd-border-subtle bg-nd-surface-secondary/20"
              />
            ) : (
              profiles.map((profile) => {
                const active = profile.id === selectedProfileId;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent-primary/60 ${
                      active
                        ? "border-nd-accent-primary/40 bg-nd-surface-selected"
                        : "border-nd-border-subtle bg-nd-surface-secondary/40 hover:border-nd-accent-primary/30 hover:bg-nd-surface-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-nd-text-primary">{profile.name}</span>
                      {profile.policy.killSwitchEnabled && <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-nd-accent-warning" aria-hidden="true" />}
                    </div>
                    <div className="mt-0.5 text-[11px] text-nd-text-muted">{profile.providerName}</div>
                    <div className="mt-2">
                      <Badge tone={badgeTone(profile.diagnostics.lastState)} size="sm" variant="outline">
                        {stateLabel(profile.diagnostics.lastState)}
                      </Badge>
                    </div>
                  </button>
                );
              })
            )}
            {templates.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                fullWidth
                icon={Shield}
                onClick={() => void importTemplate(templates[0])}
                disabled={busy}
              >
                Import first template
              </Button>
            )}
          </section>

          {/* Details */}
          <section className="flex min-h-0 flex-col gap-3 overflow-auto rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-3">
            {selectedProfile ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs text-nd-text-muted">
                  <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-3">
                    Mode: <span className="text-nd-text-primary">{selectedProfile.routeMode}</span>
                  </div>
                  <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-3">
                    Protocol: <span className="text-nd-text-primary">{selectedProfile.protocol}</span>
                  </div>
                  <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-3">
                    Profiles:{" "}
                    <span className="text-nd-text-primary">{selectedProfile.browserProfileIds.join(", ") || "default"}</span>
                  </div>
                  <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-3">
                    Security: <span className="text-nd-text-primary">{selectedProfile.security}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="success" size="sm" icon={ShieldCheck} onClick={() => void connect()} disabled={busy}>
                    Connect
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void disconnect()} disabled={busy}>
                    Disconnect
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => void verify()} disabled={busy}>
                    Verify
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void repair()} disabled={busy}>
                    Repair
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void saveProfile()} disabled={busy}>
                    Save
                  </Button>
                </div>

                <div className="rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3">
                  <Toggle
                    checked={selectedProfile.policy.killSwitchEnabled}
                    onChange={() => setKillSwitch(!selectedProfile.policy.killSwitchEnabled)}
                    label="Kill switch enabled"
                    disabled={busy}
                  />
                  <p className="mt-2 text-[11px] text-nd-text-muted">
                    Block all browser traffic when the VPN tunnel drops.
                  </p>
                </div>

                <label className="flex flex-1 flex-col gap-1 text-xs text-nd-text-muted">
                  Imported config preview
                  <textarea
                    value={configText}
                    onChange={(e) => setConfigText(e.target.value)}
                    className="min-h-28 flex-1 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 px-3 py-2 text-xs text-nd-text-primary outline-none focus:border-nd-accent-primary/40 focus-visible:ring-2 focus-visible:ring-nd-accent-primary/30"
                  />
                </label>
              </>
            ) : (
              <EmptyState
                icon={Shield}
                title="Select a profile"
                description="Choose a VPN profile to inspect route mode, protocol, security, and diagnostics."
                compact
                className="rounded-xl border border-dashed border-nd-border-subtle bg-nd-surface-secondary/20"
              />
            )}
          </section>

          {/* Diagnostics */}
          <section className="flex min-h-0 flex-col gap-3 overflow-auto rounded-2xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-3 text-xs text-nd-text-muted">
            <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-3">
              <div className="font-semibold text-nd-text-primary">Diagnostics</div>
              <div className="mt-2 flex items-center gap-2">
                State:{" "}
                <StatusChip tone={statusTone(diagnostics?.status ?? "not_configured")} size="sm">
                  {diagnostics?.status ?? "not_configured"}
                </StatusChip>
              </div>
              <div className="mt-1">Active profile: <span className="text-nd-text-primary">{diagnostics?.activeProfileId ?? "none"}</span></div>
              <div>Route: <span className="text-nd-text-primary">{diagnostics?.routeMode ?? "n/a"}</span></div>
              <div>Protocol: <span className="text-nd-text-primary">{diagnostics?.protocol ?? "n/a"}</span></div>
            </div>

            <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-3">
              <div className="font-semibold text-nd-text-primary">Evidence</div>
              <div className="mt-2 space-y-2">
                {evidence.slice(-4).map((item) => (
                  <div key={item.requestId} className="rounded-lg border border-nd-border-subtle bg-nd-surface-app/60 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-nd-text-primary">{item.probe}</span>
                      <Badge tone={badgeTone(item.status)} size="sm" variant="outline">
                        {item.status}
                      </Badge>
                    </div>
                    <div className="mt-1">{item.redactedSummary}</div>
                  </div>
                ))}
                {evidence.length === 0 && <p className="text-nd-text-muted/70 italic">No evidence recorded.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/60 p-3">
              <div className="font-semibold text-nd-text-primary">Providers</div>
              <div className="mt-2 space-y-2">
                {providers.map((provider) => (
                  <div key={provider.providerName} className="rounded-lg border border-nd-border-subtle bg-nd-surface-app/60 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-nd-text-primary">{provider.providerName}</span>
                      <Badge tone={badgeTone(provider.status)} size="sm" variant="outline">
                        {provider.status}
                      </Badge>
                    </div>
                    <div className="mt-1">{provider.notes}</div>
                  </div>
                ))}
                {providers.length === 0 && <p className="text-nd-text-muted/70 italic">No provider data.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-nd-accent-warning/25 bg-nd-accent-warning/10 p-3 text-nd-accent-warning">
              <AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true" />
              Unsupported locked clients remain unsupported until a real config or CLI path exists.
            </div>
          </section>
        </div>
      </Panel>
    </div>
  );
}
