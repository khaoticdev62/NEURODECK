import { Loader2, RefreshCw, Terminal, Wifi, KeyRound, Volume2, HardDrive, Rocket, Shield, Network } from 'lucide-react';
import type { OnboardingDiagnosticResult } from '../../../types/onboarding';

export type InstallerItemState =
  | { state: 'idle' }
  | { state: 'downloading'; percent?: number; speed?: number }
  | { state: 'installing' }
  | { state: 'verifying' }
  | { state: 'completed' }
  | { state: 'failed'; error?: string };

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

  if (progress.state === 'idle') {
    return (
      <button
        type="button"
        onClick={() => onInstall(id)}
        className="mt-2 inline-flex h-7 items-center gap-1 rounded-lg bg-nd-accent/10 border border-nd-accent/30 px-3 text-[10px] font-semibold text-nd-accent transition hover:bg-nd-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nd-accent/40"
      >
        Install Subsystem
      </button>
    );
  }

  if (
    progress.state === 'downloading' ||
    progress.state === 'installing' ||
    progress.state === 'verifying'
  ) {
    const percent = progress.state === 'downloading' ? (progress.percent ?? 0) : 100;
    const speedMb =
      progress.state === 'downloading' && progress.speed
        ? (progress.speed / (1024 * 1024)).toFixed(1)
        : '0.0';

    return (
      <div className="mt-2.5 space-y-1.5 p-2 rounded-lg bg-nd-accent/[0.03] border border-nd-accent/15">
        <div className="flex items-center justify-between text-[9px] text-nd-text-muted">
          <span className="capitalize">{progress.state}...</span>
          <span>{progress.state === 'downloading' ? `${percent}% (${speedMb} MB/s)` : ''}</span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-nd-accent/10">
          <div
            className="h-full bg-nd-accent transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onCancel(id)}
            className="text-[9px] text-nd-danger hover:underline font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (progress.state === 'failed') {
    return (
      <div className="mt-2.5 space-y-1.5">
        <p className="text-[10px] text-nd-danger font-medium">Failed: {progress.error}</p>
        <button
          type="button"
          onClick={() => onInstall(id)}
          className="inline-flex h-6 items-center gap-1 rounded bg-nd-danger/10 border border-nd-danger/35 px-2.5 text-[9px] font-semibold text-nd-danger transition hover:bg-nd-danger/20"
        >
          Retry
        </button>
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
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
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
    <div className="flex items-start gap-3 rounded-xl border border-nd-text-muted/10 bg-nd-surface/30 p-3">
      <Icon
        className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${ok ? 'text-nd-success' : 'text-nd-warning'}`}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-nd-text">{label}</span>
          <span className={`text-[10px] font-bold uppercase ${ok ? 'text-nd-success' : 'text-nd-warning'}`}>
            {ok ? okLabel : failLabel}
          </span>
        </div>
        <p className="text-[11px] text-nd-text-muted mt-0.5">{detail}</p>
        {!ok && fix && (
          <p className="text-[10px] text-nd-warning mt-1"><strong>Fix:</strong> {fix}</p>
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
  const prog = (id: string): InstallerItemState =>
    installerProgress[id] ?? { state: 'idle' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-nd-text">Environment Integrity Check</h2>
          <p className="text-xs text-nd-text-muted">Verifying system access layers and dependencies.</p>
        </div>
        <button
          type="button"
          onClick={onRescan}
          disabled={diagnosticsLoading}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-nd-text-muted/15 bg-nd-surface/40 px-3 text-xs text-nd-text transition hover:bg-nd-surface/65"
        >
          <RefreshCw className={`h-3 w-3 ${diagnosticsLoading ? 'animate-spin' : ''}`} aria-hidden="true" /> Re-scan
        </button>
      </div>

      {diagnosticsLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-nd-accent" aria-hidden="true" />
          <p className="text-xs text-nd-text-muted font-medium">Scanning subsystem endpoints...</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {diagnosticResult && (
            <>
              <DiagRow
                ok={diagnosticResult.pty_ok}
                icon={Terminal}
                label="PTY Terminal Subsystem"
                status={['Ready', 'Error']}
                detail={diagnosticResult.pty_details}
                fix="Verify terminal binary permissions or run app as admin."
                onInstall={onInstall}
                onCancelInstall={onCancelInstall}
              />
              <DiagRow
                ok={diagnosticResult.network_ok}
                icon={Wifi}
                label="Bridge Connection &amp; Internet"
                status={['Connected', 'Warning']}
                detail={diagnosticResult.network_details}
                fix="Check your local router connection or firewall port 9477."
                onInstall={onInstall}
                onCancelInstall={onCancelInstall}
              />
              <DiagRow
                ok={diagnosticResult.keychain_ok}
                icon={KeyRound}
                label="Secure Credential Storage"
                status={['Active', 'Unprobed']}
                detail={diagnosticResult.keychain_details}
                fix="Keychain locked or blocked. Keys saved locally instead."
                onInstall={onInstall}
                onCancelInstall={onCancelInstall}
              />
              <DiagRow
                ok={diagnosticResult.audio_ok}
                icon={Volume2}
                label="Voice Input Devices"
                status={['Detected', 'Unprobed']}
                detail={diagnosticResult.audio_details}
                fix="Connect a microphone input device for voice STT commands."
                onInstall={onInstall}
                onCancelInstall={onCancelInstall}
              />
              <DiagRow
                ok={diagnosticResult.ssh_ok}
                icon={HardDrive}
                label="SSH Client Subsystem"
                status={['Detected', 'Missing']}
                detail={diagnosticResult.ssh_details}
                fix="Install OpenSSH or ensure ssh.exe is in system environment PATH."
                installerId="ssh"
                isInstalled={diagnosticResult.ssh_ok}
                progress={prog('ssh')}
                onInstall={onInstall}
                onCancelInstall={onCancelInstall}
              />
              <DiagRow
                ok={diagnosticResult.tts_ok}
                icon={Volume2}
                label="TTS Speech Subsystem"
                status={['Ready', 'Missing']}
                detail={diagnosticResult.tts_details}
                fix="Install espeak-ng for local voice capabilities."
                installerId="tts"
                isInstalled={diagnosticResult.tts_ok}
                progress={prog('tts')}
                onInstall={onInstall}
                onCancelInstall={onCancelInstall}
              />
              <DiagRow
                ok={ollamaInstalled}
                icon={Rocket}
                label="Ollama AI Runtime"
                status={['Detected', 'Missing']}
                detail={ollamaInstalled ? 'Local LLM runtime is available.' : 'Install Ollama to run high-performance models locally offline.'}
                installerId="ollama"
                isInstalled={ollamaInstalled}
                progress={prog('ollama')}
                onInstall={onInstall}
                onCancelInstall={onCancelInstall}
              />
              <DiagRow
                ok={openvpnInstalled}
                icon={Shield}
                label="OpenVPN Client Subsystem"
                status={['Detected', 'Missing']}
                detail={openvpnInstalled ? 'OpenVPN client binary is active.' : 'Install OpenVPN to run secure tunnels using OpenVPN profiles.'}
                installerId="openvpn"
                isInstalled={openvpnInstalled}
                progress={prog('openvpn')}
                onInstall={onInstall}
                onCancelInstall={onCancelInstall}
              />
              <DiagRow
                ok={wireguardInstalled}
                icon={Network}
                label="WireGuard Client Subsystem"
                status={['Detected', 'Missing']}
                detail={wireguardInstalled ? 'WireGuard client (wg) binary is active.' : 'Install WireGuard to run secure tunnels using WireGuard profiles.'}
                installerId="wireguard"
                isInstalled={wireguardInstalled}
                progress={prog('wireguard')}
                onInstall={onInstall}
                onCancelInstall={onCancelInstall}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
