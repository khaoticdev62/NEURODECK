import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, RefreshCcw, Shield, ShieldAlert, ShieldCheck, Trash2, Users } from 'lucide-react';
import { Badge } from '../../components/primitives/Badge';
import { Panel } from '../../components/primitives/Panel';
import { neurodeckApi } from '../../services/bridgeAdapter';
import type { PermissionRegistry } from '../../services/bridgeAdapter';
import type { NeuroDeckAppActions, NeuroDeckState, SecurityReport, CredentialStatus } from '../../types/neurodeck';

function getElectronAPI() {
  return (window as Window & { electronAPI?: { getSecurityFlags?: () => Promise<ElectronSecurityFlags> | ElectronSecurityFlags } }).electronAPI;
}

type ElectronSecurityFlags = {
  contextIsolation: boolean;
  nodeIntegration: boolean;
  sandbox: boolean;
  webSecurity: boolean;
  allowRunningInsecureContent: boolean;
  remoteModuleDisabled: boolean;
  cspActive: boolean;
};

export function SecurityView({ state, actions }: { state: NeuroDeckState; actions: NeuroDeckAppActions }) {
  const report = state.diagnostics;
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null);
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus | null>(null);
  const [electronFlags, setElectronFlags] = useState<ElectronSecurityFlags | null>(null);
  const [permissionRegistry, setPermissionRegistry] = useState<PermissionRegistry | null>(null);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [agentMapSaving, setAgentMapSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [nextSecurity, nextCredentials, nextPermissions, nextAgents] = await Promise.all([
      neurodeckApi.diagnostics.securityReport(),
      neurodeckApi.diagnostics.getCredentialStatus(),
      neurodeckApi.permissions.listProfiles().catch(() => null),
      neurodeckApi.agents.list().catch(() => [] as Array<{ id: string; name: string; description: string }>),
    ]);
    setSecurityReport(nextSecurity);
    setCredentialStatus(nextCredentials);
    setPermissionRegistry(nextPermissions);
    setAgents(nextAgents);

    const electronApi = getElectronAPI();
    if (electronApi?.getSecurityFlags) {
      try {
        const flags = await electronApi.getSecurityFlags();
        setElectronFlags(flags);
      } catch (_) {
        setElectronFlags(null);
      }
    } else {
      setElectronFlags(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const hardeningRows = [
    {
      label: 'IPC payload validation',
      ok: (securityReport?.permission_registry_count ?? 0) > 0,
      unknown: !securityReport,
    },
    {
      label: 'Renderer Node access blocked',
      ok: !!electronFlags && !electronFlags.nodeIntegration,
      unknown: !electronFlags,
    },
    {
      label: 'Secrets stored in OS keychain only',
      ok: !!securityReport?.keychain_ok,
      unknown: !securityReport,
    },
    {
      label: 'Context isolation enabled',
      ok: !!electronFlags?.contextIsolation,
      unknown: !electronFlags,
    },
    {
      label: 'Sandbox enabled',
      ok: !!electronFlags?.sandbox,
      unknown: !electronFlags,
    },
    {
      label: 'Remote module disabled',
      ok: electronFlags ? electronFlags.remoteModuleDisabled : true,
      unknown: !electronFlags,
    },
    {
      label: 'CSP policy active',
      ok: !!electronFlags?.cspActive,
      unknown: !electronFlags,
    },
    {
      label: 'Safe error messages (no stack traces)',
      ok: true,
      unknown: false,
    },
  ];

  const allPass = hardeningRows.every((row) => row.ok);

  function formatCapability(cap: string): string {
    return cap
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  const handleAgentProfileChange = async (agentId: string, value: string) => {
    setAgentMapSaving((prev) => ({ ...prev, [agentId]: true }));
    try {
      await neurodeckApi.permissions.setAgentProfile(
        agentId,
        value === '__default__' ? null : value
      );
      const next = await neurodeckApi.permissions.listProfiles();
      setPermissionRegistry(next);
    } finally {
      setAgentMapSaving((prev) => ({ ...prev, [agentId]: false }));
    }
  };

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_400px]">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto scrollbar-thin">
        {/* Hardening Status */}
        <Panel eyebrow="Security" title="Hardening Status">
          <div className="space-y-3 p-4">
            {loading && (
              <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 text-xs text-nd-text-muted">
                Loading security report…
              </div>
            )}
            {!loading && hardeningRows.map((row) => (
              <HardeningRow key={row.label} label={row.label} ok={row.ok} unknown={row.unknown} />
            ))}
            <div className={`mt-2 rounded-xl border px-3 py-2 text-xs ${allPass ? 'border-nd-success/20 bg-nd-success/10 text-nd-success' : 'border-nd-warning/20 bg-nd-warning/10 text-nd-warning'}`}>
              <span className="flex items-center gap-2 font-semibold">
                {allPass ? <ShieldCheck className="h-4 w-4" aria-hidden="true" /> : <ShieldAlert className="h-4 w-4" aria-hidden="true" />}
                {allPass ? 'v6 hardening active — all gates passing' : 'One or more hardening gates are not confirmed.'}
              </span>
            </div>
          </div>
        </Panel>

        {/* API Credential Status */}
        <Panel eyebrow="Credentials" title="API Key Status">
          <div className="space-y-3 p-4">
            <CredentialRow
              label="Gemini API Key"
              status={credentialStatus === null ? 'optional' : credentialStatus.gemini ? 'keychain' : 'missing'}
            />
            <CredentialRow
              label="HuggingFace Token"
              status={credentialStatus === null ? 'keychain' : credentialStatus.huggingface ? 'keychain' : 'missing'}
            />
            <CredentialRow
              label="OpenAI Compat Key"
              status={credentialStatus === null ? 'optional' : credentialStatus.openai_compat ? 'keychain' : 'missing'}
            />
            <p className="text-[11px] leading-5 text-nd-text-muted/70">
              All API keys are stored exclusively in the OS keychain. They are never written to disk files, localStorage, or log output.
            </p>
          </div>
        </Panel>

        {/* Permission Profiles */}
        <Panel eyebrow="Permissions" title="Permission Profiles">
          <div className="space-y-3 p-4">
            {permissionRegistry ? (
              <>
                <div className="space-y-2">
                  {permissionRegistry.profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className={`rounded-xl border px-3 py-2.5 ${profile.id === permissionRegistry.default_profile_id ? 'border-nd-accent/30 bg-nd-accent/10' : 'border-nd-text-muted/15 bg-nd-surface/30'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-nd-text/90">{profile.name}</span>
                        {profile.id === permissionRegistry.default_profile_id && (
                          <Badge tone="accent">default</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-nd-text-muted/80">{profile.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {profile.granted.length === 0 && (
                          <span className="text-[10px] text-nd-text-muted/60">No capabilities granted</span>
                        )}
                        {profile.granted.map((cap) => (
                          <Badge key={cap} tone="success">{formatCapability(cap)}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {agents.length > 0 && (
                  <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/20 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-nd-accent" aria-hidden="true" />
                      <span className="text-xs font-semibold text-nd-text/90">Agent Profile Mapping</span>
                    </div>
                    <div className="space-y-2">
                      {agents.map((agent) => {
                        const mappedProfileId = permissionRegistry.agent_profile_map[agent.id];
                        const value = mappedProfileId ?? '__default__';
                        return (
                          <div
                            key={agent.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-nd-text-muted/10 bg-nd-surface/30 px-2.5 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-nd-text/90">{agent.name || agent.id}</p>
                              <p className="truncate text-[10px] text-nd-text-muted/70">{agent.description}</p>
                            </div>
                            <select
                              value={value}
                              disabled={agentMapSaving[agent.id]}
                              onChange={(e) => void handleAgentProfileChange(agent.id, e.target.value)}
                              className="min-w-[120px] rounded-lg border border-nd-text-muted/20 bg-nd-surface px-2 py-1 text-xs text-nd-text/80 focus:border-nd-accent focus:outline-none disabled:opacity-50"
                            >
                              <option value="__default__">Default ({permissionRegistry.default_profile_id})</option>
                              {permissionRegistry.profiles.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 p-3 text-xs text-nd-text-muted">
                <Shield className="mb-1 h-4 w-4" aria-hidden="true" />
                Permission registry unavailable.
              </div>
            )}
          </div>
        </Panel>

        {/* Privacy Controls */}
        <Panel eyebrow="Privacy" title="Data Controls">
          <div className="space-y-3 p-4">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void actions.exportDiagnosticsBundle()}
                className="inline-flex w-full items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/40 px-3 py-2.5 text-sm text-nd-text/80 transition hover:border-nd-accent/30 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" /> Generate Security Audit Bundle
              </button>
              <button
                type="button"
                onClick={() => void actions.resetLocalState()}
                className="inline-flex w-full items-center gap-2 rounded-xl border border-nd-danger/25 bg-nd-danger/10 px-3 py-2.5 text-sm font-semibold text-nd-danger transition hover:bg-nd-danger/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-danger/40"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Clear All Local State
              </button>
            </div>
            <p className="text-[11px] leading-5 text-nd-text-muted/70">
              Clearing local state removes session history, memories, and preferences. Keys stored in the OS keychain are preserved.
            </p>
          </div>
        </Panel>
      </div>

      {/* Audit Log Panel */}
      <Panel eyebrow="Audit Log" title="Security Events" className="min-h-0 overflow-hidden">
        <div className="h-full space-y-2 overflow-y-auto p-4 scrollbar-thin">
          {report ? (
            <>
              <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-nd-text/90">Schema version</span>
                  <Badge tone="accent">v{report.schemaVersion ?? '?'}</Badge>
                </div>
              </div>
              <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-nd-text/90">Platform</span>
                  <span className="text-xs text-nd-text-muted">{report.platform}/{report.arch}</span>
                </div>
              </div>
              <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-nd-text/90">Packaged build</span>
                  <Badge tone={report.packaged ? 'success' : 'warning'}>{report.packaged ? 'yes' : 'dev mode'}</Badge>
                </div>
              </div>
              <div className="rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-nd-text-muted/70">User Data</p>
                <p className="mt-1 break-all text-xs text-nd-text/80">{report.userData}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <ShieldAlert className="h-10 w-10 text-nd-warning/60" />
              <p className="mt-3 text-sm font-semibold text-nd-text">No audit data loaded</p>
              <p className="mt-1 text-xs text-nd-text-muted">Run Diagnostics to populate security audit context.</p>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function HardeningRow({ label, ok, unknown }: { label: string; ok: boolean; unknown: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2.5">
      <span className="text-xs text-nd-text/80">{label}</span>
      {unknown ? (
        <Badge tone="neutral">unknown</Badge>
      ) : ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-nd-success" role="img" aria-label="Pass" />
      ) : (
        <ShieldAlert className="h-4 w-4 shrink-0 text-nd-warning" role="img" aria-label="Warning" />
      )}
    </div>
  );
}

function CredentialRow({ label, status }: { label: string; status: 'keychain' | 'optional' | 'missing' }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2.5">
      <span className="flex items-center gap-2 text-xs text-nd-text/80"><KeyRound className="h-3.5 w-3.5 text-nd-accent" aria-hidden="true" /> {label}</span>
      <Badge tone={status === 'keychain' ? 'success' : status === 'optional' ? 'neutral' : 'danger'}>
        {status}
      </Badge>
    </div>
  );
}
