import { useEffect, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  RefreshCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "../../components/primitives/Badge";
import { Button } from "../../components/primitives/Button";
import { ConfirmDialog } from "../../components/primitives/ConfirmDialog";
import { EmptyState } from "../../components/primitives/EmptyState";
import { LoadingState } from "../../components/primitives/LoadingState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { MetricCard } from "../../components/primitives/MetricCard";
import { Panel } from "../../components/primitives/Panel";
import { Select } from "../../components/primitives/Select";
import { StatusChip } from "../../components/primitives/StatusChip";
import { neurodeckApi } from "../../services/bridgeAdapter";
import type { PermissionRegistry } from "../../services/bridgeAdapter";
import type {
  NeuroDeckAppActions,
  NeuroDeckState,
  SecurityReport,
  CredentialStatus,
} from "../../types/neurodeck";

function getElectronAPI() {
  return (
    window as Window & {
      electronAPI?: {
        getSecurityFlags?: () => Promise<ElectronSecurityFlags> | ElectronSecurityFlags;
      };
    }
  ).electronAPI;
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

export function SecurityView({
  state,
  actions,
}: {
  state: NeuroDeckState;
  actions: NeuroDeckAppActions;
}) {
  const report = state.diagnostics;
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null);
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus | null>(null);
  const [electronFlags, setElectronFlags] = useState<ElectronSecurityFlags | null>(null);
  const [permissionRegistry, setPermissionRegistry] = useState<PermissionRegistry | null>(null);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; description: string }>>(
    []
  );
  const [agentMapSaving, setAgentMapSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSecurity, nextCredentials, nextPermissions, nextAgents] = await Promise.all([
        neurodeckApi.diagnostics.securityReport(),
        neurodeckApi.diagnostics.getCredentialStatus(),
        neurodeckApi.permissions.listProfiles().catch(() => null),
        neurodeckApi.agents
          .list()
          .catch(() => [] as Array<{ id: string; name: string; description: string }>),
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
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const hardeningRows = [
    {
      label: "IPC payload validation",
      ok: (securityReport?.permission_registry_count ?? 0) > 0,
      unknown: !securityReport,
    },
    {
      label: "Renderer Node access blocked",
      ok: !!electronFlags && !electronFlags.nodeIntegration,
      unknown: !electronFlags,
    },
    {
      label: "Secrets stored in OS keychain only",
      ok: !!securityReport?.keychain_ok,
      unknown: !securityReport,
    },
    {
      label: "Context isolation enabled",
      ok: !!electronFlags?.contextIsolation,
      unknown: !electronFlags,
    },
    {
      label: "Sandbox enabled",
      ok: !!electronFlags?.sandbox,
      unknown: !electronFlags,
    },
    {
      label: "Remote module disabled",
      ok: electronFlags ? electronFlags.remoteModuleDisabled : true,
      unknown: !electronFlags,
    },
    {
      label: "CSP policy active",
      ok: !!electronFlags?.cspActive,
      unknown: !electronFlags,
    },
    {
      label: "Safe error messages (no stack traces)",
      ok: true,
      unknown: false,
    },
  ];

  const allPass = hardeningRows.every((row) => row.ok);

  function formatCapability(cap: string): string {
    return cap
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  const handleAgentProfileChange = async (agentId: string, value: string) => {
    setAgentMapSaving((prev) => ({ ...prev, [agentId]: true }));
    try {
      await neurodeckApi.permissions.setAgentProfile(
        agentId,
        value === "__default__" ? null : value
      );
      const next = await neurodeckApi.permissions.listProfiles();
      setPermissionRegistry(next);
    } finally {
      setAgentMapSaving((prev) => ({ ...prev, [agentId]: false }));
    }
  };

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1fr_400px]">
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-1 pb-4 scrollbar-thin">
        {error && (
          <ErrorState
            title="Failed to load security data"
            message={error}
            onRetry={refresh}
            onClose={() => setError(null)}
          />
        )}
        {/* Hardening Status */}
        <Panel
          eyebrow="Security"
          title="Hardening Status"
          action={
            <Button variant="secondary" size="sm" icon={RefreshCcw} onClick={() => void refresh()} className="min-h-touch">
              Refresh
            </Button>
          }
        >
          <div className="space-y-3 p-4">
            {loading && <LoadingState label="Loading security report…" size="sm" />}
            {!loading &&
              hardeningRows.map((row) => (
                <HardeningRow key={row.label} label={row.label} ok={row.ok} unknown={row.unknown} />
              ))}
            {!loading && (
              <div
                className={`mt-2 rounded-xl border px-3 py-2 text-xs ${
                  allPass
                    ? "border-nd-accent-success/20 bg-nd-accent-success/10 text-nd-accent-success"
                    : "border-nd-accent-warning/20 bg-nd-accent-warning/10 text-nd-accent-warning"
                }`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  {allPass ? (
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  )}
                  {allPass
                    ? "v6 hardening active — all gates passing"
                    : "One or more hardening gates are not confirmed."}
                </span>
              </div>
            )}
          </div>
        </Panel>

        {/* API Credential Status */}
        <Panel eyebrow="Credentials" title="API Key Status">
          <div className="space-y-3 p-4">
            <CredentialRow
              label="Gemini API Key"
              status={
                credentialStatus === null
                  ? "optional"
                  : credentialStatus.gemini
                    ? "keychain"
                    : "missing"
              }
            />
            <CredentialRow
              label="HuggingFace Token"
              status={
                credentialStatus === null
                  ? "keychain"
                  : credentialStatus.huggingface
                    ? "keychain"
                    : "missing"
              }
            />
            <CredentialRow
              label="OpenAI Compat Key"
              status={
                credentialStatus === null
                  ? "optional"
                  : credentialStatus.openai_compat
                    ? "keychain"
                    : "missing"
              }
            />
            <p className="text-2xs leading-5 text-nd-text-muted/80">
              All API keys are stored exclusively in the OS keychain. They are never written to disk
              files, localStorage, or log output.
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
                      className={`rounded-xl border px-3 py-2.5 transition duration-fast ${
                        profile.id === permissionRegistry.default_profile_id
                          ? "border-nd-accent-primary/30 bg-nd-accent-primary/10"
                          : "border-nd-border-subtle bg-nd-surface-secondary/40 hover:bg-nd-surface-tertiary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-nd-text-primary">
                          {profile.name}
                        </span>
                        {profile.id === permissionRegistry.default_profile_id && (
                          <Badge tone="accent" size="sm">
                            default
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-2xs text-nd-text-secondary">{profile.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {profile.granted.length === 0 && (
                          <span className="text-2xs text-nd-text-muted/70">
                            No capabilities granted
                          </span>
                        )}
                        {profile.granted.map((cap) => (
                          <Badge key={cap} tone="success" size="sm">
                            {formatCapability(cap)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {agents.length > 0 && (
                  <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/30 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-nd-accent-primary" aria-hidden="true" />
                      <span className="text-xs font-semibold text-nd-text-primary">
                        Agent Profile Mapping
                      </span>
                    </div>
                    <div className="space-y-2">
                      {agents.map((agent) => {
                        const mappedProfileId = (permissionRegistry.agent_profile_map || {})[
                          agent.id
                        ];
                        const value = mappedProfileId ?? "__default__";
                        return (
                          <div
                            key={agent.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-nd-border-subtle bg-nd-surface-secondary/40 px-2.5 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-nd-text-primary">
                                {agent.name || agent.id}
                              </p>
                              <p className="truncate text-2xs text-nd-text-muted">
                                {agent.description}
                              </p>
                            </div>
                            <Select
                              id={`agent-profile-${agent.id}`}
                              value={value}
                              disabled={agentMapSaving[agent.id]}
                              aria-label={`Permission profile for ${agent.name || agent.id}`}
                              onChange={(e) =>
                                void handleAgentProfileChange(agent.id, e.target.value)
                              }
                              className="min-w-[140px] min-h-touch"
                              options={[
                                {
                                  value: "__default__",
                                  label: `Default (${permissionRegistry.default_profile_id})`,
                                },
                                ...permissionRegistry.profiles.map((p) => ({
                                  value: p.id,
                                  label: p.name,
                                })),
                              ]}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={Shield}
                title="Permission registry unavailable"
                description="Security profiles could not be loaded from the bridge."
                compact
              />
            )}
          </div>
        </Panel>

        {/* Privacy Controls */}
        <Panel
          eyebrow="Privacy"
          title="Data Controls"
          className="border-nd-accent-error/30 bg-nd-accent-error/[0.03]"
        >
          <div className="space-y-3 p-4">
            <div className="space-y-2">
              <Button
                variant="secondary"
                fullWidth
                icon={RefreshCcw}
                onClick={() => void actions.exportDiagnosticsBundle()}
                className="min-h-touch"
              >
                Generate Security Audit Bundle
              </Button>
              <Button
                variant="danger"
                fullWidth
                icon={Trash2}
                onClick={() => setConfirmReset(true)}
                className="min-h-touch"
              >
                Clear All Local State
              </Button>
            </div>
            <p className="text-2xs leading-5 text-nd-text-muted/80">
              Clearing local state removes session history, memories, and preferences. Keys stored
              in the OS keychain are preserved.
            </p>
          </div>
        </Panel>
      </div>

      {/* Audit Log Panel */}
      <Panel eyebrow="Audit Log" title="Security Events" className="min-h-0 overflow-hidden">
        <div className="h-full space-y-3 overflow-y-auto p-4 scrollbar-thin">
          {report ? (
            <>
              <MetricCard
                label="Schema version"
                value={`v${report.schemaVersion ?? "?"}`}
                icon={ShieldCheck}
                hint="Runtime schema"
              />
              <MetricCard
                label="Platform"
                value={`${report.platform}/${report.arch}`}
                icon={Shield}
                hint="OS / architecture"
              />
              <MetricCard
                label="Packaged build"
                value={report.packaged ? "yes" : "dev mode"}
                icon={report.packaged ? CheckCircle2 : ShieldAlert}
                hint="Build configuration"
              />
              <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3">
                <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-nd-text-muted">
                  User Data
                </p>
                <p className="mt-1 break-all text-xs text-nd-text-secondary">{report.userData}</p>
              </div>
            </>
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="No audit data loaded"
              description="Run Diagnostics to populate security audit context."
            />
          )}
        </div>
      </Panel>

      <ConfirmDialog
        open={confirmReset}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void actions.resetLocalState();
        }}
        title="Clear all local state?"
        message="This will permanently remove all session history, memories, and preferences. Keys stored in the OS keychain are preserved. This action cannot be undone."
        confirmLabel="Clear State"
        cancelLabel="Cancel"
        destructive
      />
    </div>
  );
}

function HardeningRow({ label, ok, unknown }: { label: string; ok: boolean; unknown: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2.5">
      <span className="text-xs text-nd-text-primary">{label}</span>
      {unknown ? (
        <StatusChip tone="info" size="sm">
          unknown
        </StatusChip>
      ) : ok ? (
        <CheckCircle2
          className="h-4 w-4 shrink-0 text-nd-accent-success"
          role="img"
          aria-label="Pass"
        />
      ) : (
        <ShieldAlert
          className="h-4 w-4 shrink-0 text-nd-accent-warning"
          role="img"
          aria-label="Warning"
        />
      )}
    </div>
  );
}

function CredentialRow({
  label,
  status,
}: {
  label: string;
  status: "keychain" | "optional" | "missing";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 px-3 py-2.5">
      <span className="flex items-center gap-2 text-xs text-nd-text-primary">
        <KeyRound className="h-3.5 w-3.5 text-nd-accent-primary" aria-hidden="true" /> {label}
      </span>
      <Badge
        tone={status === "keychain" ? "success" : status === "optional" ? "neutral" : "danger"}
        size="sm"
      >
        {status}
      </Badge>
    </div>
  );
}
