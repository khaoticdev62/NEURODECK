import type { Dispatch } from "react";
import { FileArchive, FileDown, RefreshCcw } from "lucide-react";
import { Button } from "../../../components/primitives/Button";
import { Panel } from "../../../components/primitives/Panel";
import { neurodeckApi } from "../../../services/bridgeAdapter";
import type { NeuroDeckAction, NeuroDeckAppActions, NeuroDeckState } from "../../../types/neurodeck";

export interface ExtensionsSettingsPanelProps {
  state: NeuroDeckState;
  dispatch: Dispatch<NeuroDeckAction>;
  actions: NeuroDeckAppActions;
}

export function ExtensionsSettingsPanel({ state, dispatch, actions }: ExtensionsSettingsPanelProps) {
  return (
    <div id="sp-extensions" className="settings-panel active space-y-4">
      <Panel eyebrow="Native Actions" title="Utilities">
        <div className="space-y-2 p-4">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            icon={RefreshCcw}
            onClick={async () => {
              dispatch({ type: "set-busy", label: "Refreshing diagnostic metrics..." });
              try {
                const [diag, logs] = await Promise.all([
                  neurodeckApi.diagnostics.get(),
                  neurodeckApi.diagnostics.logs(),
                ]);
                dispatch({ type: "set-diagnostics", diagnostics: diag, logs });
              } catch (e) {
                dispatch({
                  type: "set-error",
                  error: {
                    title: "Failed to refresh diagnostics",
                    message: String(e),
                    action: "Retry later",
                  },
                });
              }
              dispatch({ type: "set-busy", label: null });
            }}
          >
            Refresh Diagnostics
          </Button>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            icon={FileDown}
            onClick={() => void actions.exportSession()}
          >
            Export Active Session
          </Button>
          <Button
            variant="secondary"
            size="md"
            fullWidth
            icon={FileArchive}
            onClick={async () => {
              dispatch({
                type: "set-busy",
                label: "Exporting sanitized diagnostics bundle...",
              });
              const response = await neurodeckApi.diagnostics.exportBundle();
              if (!response.ok) {
                dispatch({
                  type: "set-error",
                  error: {
                    title: "Diagnostics export failed",
                    message: response.error,
                    action: "Refresh Diagnostics, then retry.",
                  },
                });
              } else {
                dispatch({ type: "set-export-path", path: response.file });
              }
              dispatch({ type: "set-busy", label: null });
            }}
          >
            Export Diagnostics Bundle
          </Button>
        </div>
      </Panel>

      {state.lastExportPath && (
        <Panel eyebrow="Export" title="Last Export">
          <div className="p-4">
            <p className="rounded-xl border border-nd-accent-success/20 bg-nd-accent-success/10 px-3 py-2 text-xs font-mono text-nd-accent-success break-all">
              {state.lastExportPath}
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}
