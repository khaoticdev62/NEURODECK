import {
  RefreshCw,
  Terminal,
  Wifi,
  KeyRound,
  Volume2,
  HardDrive,
  Rocket,
  Shield,
  Network,
} from "lucide-react";
import { Button } from "../../primitives/Button";
import { Panel } from "../../primitives/Panel";
import { LoadingState } from "../../primitives/LoadingState";
import { StatusChip } from "../../primitives/StatusChip";
import type { OnboardingDiagnosticResult } from "../../../types/onboarding";

export type InstallerItemState =
  | { state: "idle" }
  | { state: "downloading"; percent?: number; speed?: number }
  | { state: "installing" }
  | { state: "verifying" }
  | { state: "completed" }
  | { state: "failed"; error?: string };

export type InstallerProgressMap = Record<string, InstallerItemState>;

interface StepEnvironmentProps {
  diagnosticResult: OnboardingDiagnosticResult | null;
  diagnosticsLoading: boolean;
  ollamaInstalled: boolean;
  openvpnInstalled: boolean;
  wireguardInstalled: boolean;
  installerProgress: InstallerProgressMap;
  onRescan: () => void;
  onInstall: (id: string) => void;
  onCancelInstall: (id: string) => void;
}

function InstallerControls({
  id,
  isInstalled,
  progress,
  onInstall,
  onCancel,
}: {
  id: string;
  isInstalled: boolean;
  progress: InstallerItemState;
  onInstall: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  if (isInstalled) return null;

  if (progress.state === "idle") {
    return (
      <Button variant="primary" size="xs" onClick={() => onInstall(id)} className="mt-2">
        Install Subsystem
      </Button>
    );
  }

  if (
    progress.state === "downloading" ||
    progress.state === "installing" ||
    progress.state === "verifying"
  ) {
    const percent = progress.state === "downloading" ? (progress.percent ?? 0) : 100;
    const speedMb =
      progress.state === "downloading" && progress.speed
        ? (progress.speed / (1024 * 1024)).toFixed(1)
        : "0.0";

    return (
      <div className="mt-3 space-y-1.5 rounded-[var(--nd-radius-md)] border border-[rgba(var(--nd-cyan-rgb),0.15)] bg-[rgba(var(--nd-cyan-rgb),0.03)] p-2.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--nd-text-muted)]">
          <span className="capitalize">{progress.state}...</span>
          <span>{progress.state === "downloading" ? `${percent}% (${speedMb} MB/s)` : ""}</span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--nd-accent-soft)]">
          <div
            className="h-full bg-[var(--nd-accent-primary)] transition-all duration-300 motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="xs" onClick={() => onCancel(id)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (progress.state === "failed") {
    return (
      <div className="mt-3 space-y-1.5">
        <p className="text-[11px] text-[var(--nd-accent-error)]">Failed: {progress.error}</p>
        <Button variant="danger" size="xs" onClick={() => onInstall(id)}>
          Retry
        </Button>
      </div>
    );
  }

  return null;
}

function DiagRow({
  ok,
  icon: Icon,
  label,
  status,
  detail,
  fix,
  installerId,
  isInstalled,
  progress,
  onInstall,
  onCancelInstall,
}: {
  ok: boolean;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  status: [string, string];
  detail: string;
  fix?: string;
  installerId?: string;
  isInstalled?: boolean;
  progress?: InstallerItemState;
  onInstall: (id: string) => void;
  onCancelInstall: (id: string) => void;
}) {
  const [okLabel, failLabel] = status;
  return (
    <div className="flex items-start gap-3 rounded-[var(--nd-radius-md)] border border-[var(--nd-border-subtle)] bg-[var(--nd-surface-secondary)] p-3">
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${ok ? "text-[var(--nd-accent-success)]" : "text-[var(--nd-accent-warning)]"}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[var(--nd-text-primary)]">{label}</span>
          <StatusChip tone={ok ? "success" : "warning"} size="sm">
            {ok ? okLabel : failLabel}
          </StatusChip>
        </div>
        <p className="mt-0.5 text-xs text-[var(--nd-text-muted)]">{detail}</p>
        {!ok && fix && (
          <p className="mt-1 text-[11px] text-[var(--nd-accent-warning)]">
            <strong>Fix:</strong> {fix}
          </p>
        )}
        {installerId && progress && (
          <InstallerControls
            id={installerId}
            isInstalled={isInstalled ?? false}
            progress={progress}
            onInstall={onInstall}
            onCancel={onCancelInstall}
          />
        )}
      </div>
    </div>
  );
}

export function StepEnvironment({
  diagnosticResult,
  diagnosticsLoading,
  ollamaInstalled,
  openvpnInstalled,
  wireguardInstalled,
  installerProgress,
  onRescan,
  onInstall,
  onCancelInstall,
}: StepEnvironmentProps) {
  const prog = (id: string): InstallerItemState => installerProgress[id] ?? { state: "idle" };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--nd-text-primary)]">
            Environment Integrity Check
          </h2>
          <p className="text-xs text-[var(--nd-text-muted)]">
            Verifying system access layers and dependencies.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          loading={diagnosticsLoading}
          disabled={diagnosticsLoading}
          onClick={onRescan}
          className={diagnosticsLoading ? "[&_svg]:animate-spin" : ""}
        >
          Re-scan
        </Button>
      </div>

      {diagnosticsLoading ? (
        <LoadingState label="Scanning subsystem endpoints..." size="lg" />
      ) : (
        <Panel variant="surface" className="max-h-[340px] overflow-y-auto pr-1">
          <div className="space-y-2">
            {diagnosticResult && (
              <>
                <DiagRow
                  ok={diagnosticResult.pty_ok}
                  icon={Terminal}
                  label="PTY Terminal Subsystem"
                  status={["Ready", "Error"]}
                  detail={diagnosticResult.pty_details}
                  fix="Verify terminal binary permissions or run app as admin."
                  onInstall={onInstall}
                  onCancelInstall={onCancelInstall}
                />
                <DiagRow
                  ok={diagnosticResult.network_ok}
                  icon={Wifi}
                  label="Bridge Connection & Internet"
                  status={["Connected", "Warning"]}
                  detail={diagnosticResult.network_details}
                  fix="Check your local router connection or firewall port 9477."
                  onInstall={onInstall}
                  onCancelInstall={onCancelInstall}
                />
                <DiagRow
                  ok={diagnosticResult.keychain_ok}
                  icon={KeyRound}
                  label="Secure Credential Storage"
                  status={["Active", "Unprobed"]}
                  detail={diagnosticResult.keychain_details}
                  fix="Keychain locked or blocked. Keys saved locally instead."
                  onInstall={onInstall}
                  onCancelInstall={onCancelInstall}
                />
                <DiagRow
                  ok={diagnosticResult.audio_ok}
                  icon={Volume2}
                  label="Voice Input Devices"
                  status={["Detected", "Unprobed"]}
                  detail={diagnosticResult.audio_details}
                  fix="Connect a microphone input device for voice STT commands."
                  onInstall={onInstall}
                  onCancelInstall={onCancelInstall}
                />
                <DiagRow
                  ok={diagnosticResult.ssh_ok}
                  icon={HardDrive}
                  label="SSH Client Subsystem"
                  status={["Detected", "Missing"]}
                  detail={diagnosticResult.ssh_details}
                  fix="Install OpenSSH or ensure ssh.exe is in system environment PATH."
                  installerId="ssh"
                  isInstalled={diagnosticResult.ssh_ok}
                  progress={prog("ssh")}
                  onInstall={onInstall}
                  onCancelInstall={onCancelInstall}
                />
                <DiagRow
                  ok={diagnosticResult.tts_ok}
                  icon={Volume2}
                  label="TTS Speech Subsystem"
                  status={["Ready", "Missing"]}
                  detail={diagnosticResult.tts_details}
                  fix="Install espeak-ng for local voice capabilities."
                  installerId="tts"
                  isInstalled={diagnosticResult.tts_ok}
                  progress={prog("tts")}
                  onInstall={onInstall}
                  onCancelInstall={onCancelInstall}
                />
                <DiagRow
                  ok={ollamaInstalled}
                  icon={Rocket}
                  label="Ollama AI Runtime"
                  status={["Detected", "Missing"]}
                  detail={
                    ollamaInstalled
                      ? "Local LLM runtime is available."
                      : "Install Ollama to run high-performance models locally offline."
                  }
                  installerId="ollama"
                  isInstalled={ollamaInstalled}
                  progress={prog("ollama")}
                  onInstall={onInstall}
                  onCancelInstall={onCancelInstall}
                />
                <DiagRow
                  ok={openvpnInstalled}
                  icon={Shield}
                  label="OpenVPN Client Subsystem"
                  status={["Detected", "Missing"]}
                  detail={
                    openvpnInstalled
                      ? "OpenVPN client binary is active."
                      : "Install OpenVPN to run secure tunnels using OpenVPN profiles."
                  }
                  installerId="openvpn"
                  isInstalled={openvpnInstalled}
                  progress={prog("openvpn")}
                  onInstall={onInstall}
                  onCancelInstall={onCancelInstall}
                />
                <DiagRow
                  ok={wireguardInstalled}
                  icon={Network}
                  label="WireGuard Client Subsystem"
                  status={["Detected", "Missing"]}
                  detail={
                    wireguardInstalled
                      ? "WireGuard client (wg) binary is active."
                      : "Install WireGuard to run secure tunnels using WireGuard profiles."
                  }
                  installerId="wireguard"
                  isInstalled={wireguardInstalled}
                  progress={prog("wireguard")}
                  onInstall={onInstall}
                  onCancelInstall={onCancelInstall}
                />
              </>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
