
import { Panel } from '../../primitives/Panel';
import { LoadingState } from '../../primitives/LoadingState';
import { StatusChip } from '../../primitives/StatusChip';

interface PluginStats {
  installed: number;
  active: number;
  disabled: number;
  errors: number;
}

interface StepPluginsProps {
  pluginStats: PluginStats;
  pluginsLoading: boolean;
}

export function StepPlugins({ pluginStats, pluginsLoading }: StepPluginsProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--nd-text-primary)]">Script Automation & Plugins</h2>
        <p className="text-xs text-[var(--nd-text-muted)]">Lua scripts loaded automatically at startup to expand agent capabilities.</p>
      </div>

      {pluginsLoading ? (
        <LoadingState label="Scanning local plugins directory..." size="lg" />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Panel variant="surface" className="p-4 text-center">
              <p className="text-xs text-[var(--nd-text-muted)]">Installed plugins</p>
              <p className="mt-1 text-2xl font-bold text-[var(--nd-text-primary)]">{pluginStats.installed}</p>
            </Panel>

            <Panel variant="surface" className="p-4 text-center">
              <p className="text-xs text-[var(--nd-text-muted)]">Active scripts</p>
              <p className="mt-1 text-2xl font-bold text-[var(--nd-accent-success)]">{pluginStats.active}</p>
            </Panel>

            <Panel variant="surface" className="p-4 text-center">
              <p className="text-xs text-[var(--nd-text-muted)]">Failed QA gate</p>
              {pluginStats.errors > 0 ? (
                <StatusChip tone="error" size="md" className="mt-1 justify-center text-2xl">
                  {pluginStats.errors}
                </StatusChip>
              ) : (
                <p className="mt-1 text-2xl font-bold text-[var(--nd-text-muted)]">{pluginStats.errors}</p>
              )}
            </Panel>
          </div>

          <Panel variant="surface" className="p-4">
            <p className="text-xs leading-relaxed text-[var(--nd-text-muted)]">
              NEURODECK checks the <code className="rounded bg-[var(--nd-surface-tertiary)] px-1 py-0.5 text-[var(--nd-text-code)]">~/.config/neurodeck/plugins/</code> directory for Lua hooks. Active files are loaded securely into the sidecar mlua runtime. You can review plugin permissions and toggle active states in the controls workspace.
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}
