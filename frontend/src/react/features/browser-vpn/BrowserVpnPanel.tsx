import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCcw, X } from "lucide-react";
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

export function BrowserVpnPanel({ visible, onClose }: Props) {
  const api = window.neurodeck?.vpn as BrowserVpnApi | undefined;
  const [profiles, setProfiles] = useState<VpnProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<VpnConfigTemplate[]>([]);
  const [providers, setProviders] = useState<VpnProviderSupport[]>([]);
  const [diagnostics, setDiagnostics] = useState<VpnDiagnosticsReport | null>(null);
  const [evidence, setEvidence] = useState<VpnConnectionEvidence[]>([]);
  const [configText, setConfigText] = useState("");
  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === selectedProfileId) ?? null, [profiles, selectedProfileId]);

  const refresh = async () => {
    if (!api) return;
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
    await api.updateProfile(selectedProfile);
    await refresh();
  };

  const connect = async () => {
    if (!api || !selectedProfile) return;
    await api.connect(selectedProfile.id, selectedProfile.browserProfileIds[0]);
    await refresh();
  };

  const disconnect = async () => {
    if (!api || !selectedProfile) return;
    await api.disconnect(selectedProfile.id);
    await refresh();
  };

  const verify = async () => {
    if (!api || !selectedProfile) return;
    await api.verify(selectedProfile.id);
    await refresh();
  };

  const repair = async () => {
    if (!api || !selectedProfile) return;
    await api.repair(selectedProfile.id);
    await refresh();
  };

  const setKillSwitch = async (enabled: boolean) => {
    if (!api || !selectedProfile) return;
    await api.setKillSwitch(selectedProfile.id, enabled);
    await refresh();
  };

  return (
    <div className="absolute inset-0 z-[1200] flex items-start justify-end bg-nd-bg/60 p-4 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-[1180px] flex-col overflow-hidden rounded-3xl border border-nd-text-muted/15 bg-nd-bg/96 shadow-2xl">
        <div className="flex items-center justify-between border-b border-nd-text-muted/10 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-nd-text">Browser VPN</div>
            <div className="text-xs text-nd-text-muted">Real route profiles with redacted status and kill switch enforcement.</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void refresh()} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-xs text-nd-text-muted">
              <RefreshCcw className="mr-1 inline h-3.5 w-3.5" />
              Refresh
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-xs text-nd-text-muted">
              <X className="mr-1 inline h-3.5 w-3.5" />
              Close
            </button>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-4 xl:grid-cols-[260px_1fr_320px]">
          <section className="flex min-h-0 flex-col gap-2 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
            {profiles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-nd-text-muted/15 bg-nd-surface/20 p-3 text-sm text-nd-text-muted">No VPN profiles yet.</div>
            ) : (
              profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={`rounded-2xl border p-3 text-left transition ${profile.id === selectedProfileId ? "border-nd-accent/35 bg-nd-accent/[0.08]" : "border-nd-text-muted/15 bg-nd-surface/40"}`}
                >
                  <div className="text-sm font-semibold text-nd-text">{profile.name}</div>
                  <div className="mt-0.5 text-[11px] text-nd-text-muted">{profile.providerName}</div>
                  <div className="mt-2 text-[11px] text-nd-text-muted">{stateLabel(profile.diagnostics.lastState)}</div>
                </button>
              ))
            )}
            <button
              type="button"
              onClick={() => void importTemplate(templates[0])}
              className="rounded-2xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-xs font-semibold text-nd-accent"
            >
              Import first template
            </button>
            <button
              type="button"
              onClick={() => void setKillSwitch(!(selectedProfile?.policy.killSwitchEnabled ?? false))}
              className="rounded-2xl border border-nd-warning/25 bg-nd-warning/10 px-3 py-2 text-xs font-semibold text-nd-warning"
            >
              Toggle kill switch
            </button>
          </section>

          <section className="flex min-h-0 flex-col gap-3 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
            {selectedProfile ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs text-nd-text-muted">
                  <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">Mode: <span className="text-nd-text">{selectedProfile.routeMode}</span></div>
                  <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">Protocol: <span className="text-nd-text">{selectedProfile.protocol}</span></div>
                  <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">Profiles: <span className="text-nd-text">{selectedProfile.browserProfileIds.join(", ") || "default"}</span></div>
                  <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">Security: <span className="text-nd-text">{selectedProfile.security}</span></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void connect()} className="rounded-xl border border-nd-success/25 bg-nd-success/10 px-3 py-2 text-xs font-semibold text-nd-success">Connect</button>
                  <button type="button" onClick={() => void disconnect()} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-xs font-semibold text-nd-text-muted">Disconnect</button>
                  <button type="button" onClick={() => void verify()} className="rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-xs font-semibold text-nd-accent">Verify</button>
                  <button type="button" onClick={() => void repair()} className="rounded-xl border border-nd-warning/25 bg-nd-warning/10 px-3 py-2 text-xs font-semibold text-nd-warning">Repair</button>
                  <button type="button" onClick={() => void saveProfile()} className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-xs font-semibold text-nd-text-muted">Save</button>
                </div>
                <label className="flex flex-col gap-1 text-xs text-nd-text-muted">
                  Imported config preview
                  <textarea value={configText} onChange={(e) => setConfigText(e.target.value)} className="min-h-28 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2 text-xs text-nd-text outline-none" />
                </label>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-nd-text-muted/15 bg-nd-surface/20 p-3 text-sm text-nd-text-muted">Select a profile to inspect it.</div>
            )}
          </section>

          <section className="flex min-h-0 flex-col gap-3 overflow-auto rounded-2xl border border-nd-text-muted/15 bg-nd-surface/30 p-3 text-xs text-nd-text-muted">
            <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
              <div className="font-semibold text-nd-text">Diagnostics</div>
              <div className="mt-2">State: <span className="text-nd-text">{diagnostics?.status ?? "not_configured"}</span></div>
              <div>Active profile: <span className="text-nd-text">{diagnostics?.activeProfileId ?? "none"}</span></div>
              <div>Route: <span className="text-nd-text">{diagnostics?.routeMode ?? "n/a"}</span></div>
              <div>Protocol: <span className="text-nd-text">{diagnostics?.protocol ?? "n/a"}</span></div>
            </div>
            <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
              <div className="font-semibold text-nd-text">Evidence</div>
              <div className="mt-2 space-y-2">
                {evidence.slice(-4).map((item) => (
                  <div key={item.requestId} className="rounded-lg border border-nd-text-muted/15 bg-nd-bg/40 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-nd-text">{item.probe}</span>
                      <span>{item.status}</span>
                    </div>
                    <div className="mt-1">{item.redactedSummary}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3">
              <div className="font-semibold text-nd-text">Providers</div>
              <div className="mt-2 space-y-2">
                {providers.map((provider) => (
                  <div key={provider.providerName} className="rounded-lg border border-nd-text-muted/15 bg-nd-bg/40 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-nd-text">{provider.providerName}</span>
                      <span>{provider.status}</span>
                    </div>
                    <div className="mt-1">{provider.notes}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-nd-warning/25 bg-nd-warning/10 p-3 text-nd-warning">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              Unsupported locked clients remain unsupported until a real config or CLI path exists.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
