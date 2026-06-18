import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "../../../components/primitives/Button";
import { Panel } from "../../../components/primitives/Panel";
import type { NeuroDeckAppActions, NeuroDeckState } from "../../../types/neurodeck";
import { useRuntimeManifest } from "../hooks/useRuntimeManifest";

export interface PrivacySettingsPanelProps {
  state: NeuroDeckState;
  actions: NeuroDeckAppActions;
}

export function PrivacySettingsPanel({ actions }: PrivacySettingsPanelProps) {
  const runtimeManifest = useRuntimeManifest();

  return (
    <div id="sp-privacy" className="settings-panel active space-y-4">
      <Panel eyebrow="Storage" title="Local Data">
        <div className="p-4 space-y-4">
          <p className="text-xs leading-5 text-nd-text-muted">
            All data — settings, project context, AI messages, agent runs, and UI state — persists
            locally in the Electron userData folder. Nothing is sent to external servers without your
            explicit action.
          </p>
          <div className="rounded-xl border border-nd-border-subtle bg-nd-surface-secondary/40 p-3 space-y-1.5 text-xs text-nd-text-muted">
            {[
              ["Sessions", "userData/sessions/"],
              ["Exports", "userData/exports/"],
              ["Vector memory", "userData/data/memory/"],
              ["Profiles", "userData/data/profiles/"],
              ["Logs", "userData/logs/"],
            ].map(([label, path]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="text-nd-text-primary">{label}</span>
                <span className="font-mono text-nd-text-muted/70">{path}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel
        eyebrow="Danger Zone"
        title="Reset"
        className="border-nd-accent-error/30 bg-nd-accent-error/[0.02]"
      >
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-nd-accent-error"
              aria-hidden="true"
            />
            <p className="text-xs text-nd-text-secondary">
              Clears stored UI preferences, active session, and cached context. Does not delete
              sessions or exports from disk.
            </p>
          </div>
          <Button
            variant="danger"
            size="md"
            fullWidth
            onClick={() => void actions.resetLocalState()}
            icon={RotateCcw}
          >
            Reset Stored UI State
          </Button>
        </div>
      </Panel>

      <Panel eyebrow="About" title="NEURODECK">
        <div className="p-4 space-y-1.5 text-xs text-nd-text-muted">
          {[
            ["Version", runtimeManifest ? `v${runtimeManifest.version}` : "Unknown"],
            ["Build", runtimeManifest?.buildId ?? "Unknown"],
            ["Runtime", "Electron + axum"],
            ["Bridge", "localhost:9477"],
            ["Targets", runtimeManifest?.supportedTargets?.join(", ") ?? "Unknown"],
            ["License", "UNLICENSED — Khaotic Labs"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1"
            >
              <span className="text-nd-text-primary/60">{label}</span>
              <span className="font-mono text-nd-text-primary">{value}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
