import { Loader2 } from 'lucide-react';

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
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-nd-text">Script Automation &amp; Plugins</h2>
        <p className="text-xs text-nd-text-muted">Lua scripts loaded automatically at startup to expand agent capabilities.</p>
      </div>

      {pluginsLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-nd-accent" aria-hidden="true" />
          <p className="text-xs text-nd-text-muted font-medium">Scanning local plugins directory...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-nd-text-muted/10 bg-nd-surface/30 p-4 text-center">
              <p className="text-xs text-nd-text-muted">Installed plugins</p>
              <p className="text-2xl font-bold text-nd-text mt-1">{pluginStats.installed}</p>
            </div>

            <div className="rounded-2xl border border-nd-text-muted/10 bg-nd-surface/30 p-4 text-center">
              <p className="text-xs text-nd-text-muted">Active scripts</p>
              <p className="text-2xl font-bold text-nd-success mt-1">{pluginStats.active}</p>
            </div>

            <div className="rounded-2xl border border-nd-text-muted/10 bg-nd-surface/30 p-4 text-center">
              <p className="text-xs text-nd-text-muted">Failed QA gate</p>
              <p className={`text-2xl font-bold mt-1 ${pluginStats.errors > 0 ? 'text-nd-danger' : 'text-nd-text-muted'}`}>
                {pluginStats.errors}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-nd-text-muted/10 bg-nd-surface/20 p-4 text-xs text-nd-text-muted leading-relaxed">
            <p>
              NEURODECK checks the <code>~/.config/neurodeck/plugins/</code> directory for Lua hooks. Active files are loaded securely into the sidecar mlua runtime. You can review plugin permissions and toggle active states in the controls workspace.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
