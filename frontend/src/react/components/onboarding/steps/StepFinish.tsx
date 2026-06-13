import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { SetupWarning, SetupError } from '../../../types/onboarding';
import type { NeurodeckTheme } from '../../../../shared/theme/themeContracts';
import type { AIProvider } from '../../../types/neurodeck';

interface StepFinishProps {
  availableThemes: NeurodeckTheme[];
  themeId: string;
  fontScale: number;
  providerType: AIProvider | 'skip';
  diagnosticsErrors: SetupError[];
  diagnosticsWarnings: SetupWarning[];
}

export function StepFinish({
  availableThemes,
  themeId,
  fontScale,
  providerType,
  diagnosticsErrors,
  diagnosticsWarnings,
}: StepFinishProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-nd-text">Setup Finalization</h2>
        <p className="text-xs text-nd-text-muted">Review configuration settings before entering the workspace.</p>
      </div>

      <div className="rounded-2xl border border-nd-text-muted/10 bg-nd-surface/20 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-nd-success" aria-hidden="true" />
          <div>
            <h4 className="text-sm font-semibold text-nd-text">Configuration Verified</h4>
            <p className="text-[11px] text-nd-text-muted">System parameters written to configuration files successfully.</p>
          </div>
        </div>

        <div className="border-t border-nd-text-muted/10 pt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 text-xs">
          <div className="flex justify-between py-0.5">
            <span className="text-nd-text-muted">Active Theme:</span>
            <span className="font-semibold text-nd-text">
              {availableThemes.find((t) => t.id === themeId)?.name || 'Blacksite'}
            </span>
          </div>

          <div className="flex justify-between py-0.5">
            <span className="text-nd-text-muted">AI Provider:</span>
            <span className="font-semibold text-nd-text capitalize">{providerType === 'skip' ? 'Offline Planner' : providerType}</span>
          </div>

          <div className="flex justify-between py-0.5">
            <span className="text-nd-text-muted">Text Scaling:</span>
            <span className="font-semibold text-nd-text">{fontScale}%</span>
          </div>

          <div className="flex justify-between py-0.5">
            <span className="text-nd-text-muted">Subsystem Diagnostics:</span>
            <span className={`font-semibold ${diagnosticsErrors.length > 0 ? 'text-nd-danger' : 'text-nd-success'}`}>
              {diagnosticsErrors.length > 0 ? 'Degraded' : 'Healthy'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-nd-accent/20 bg-nd-accent/10 px-3 py-2 text-xs text-nd-text-muted">
        Steam Deck text entry: focus a field with A or Y, then use Steam + X to open the on-screen keyboard.
      </div>

      {diagnosticsWarnings.length > 0 && (
        <div className="rounded-xl border border-nd-warning/20 bg-nd-warning/5 p-3 flex items-start gap-2 text-xs text-nd-warning leading-5">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold text-nd-text">Warnings Pending Verification:</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 text-nd-text-muted text-[11px]">
              {diagnosticsWarnings.map((w) => (
                <li key={w.code}>{w.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
