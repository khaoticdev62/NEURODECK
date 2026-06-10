import { Plug, ShieldAlert } from 'lucide-react';
import { Badge } from '../primitives/Badge';
import type { PluginCard as PluginData, PluginStatus } from '../../types/neurodeck';

interface PluginCardProps {
  plugin: PluginData;
  onToggle: (id: string) => void;
}

const statusTone: Record<PluginStatus, 'success' | 'warning' | 'neutral'> = {
  enabled:        'success',
  'needs review': 'warning',
  disabled:       'neutral',
};

export function PluginCard({ plugin, onToggle }: PluginCardProps) {
  return (
    <article className="rounded-3xl border border-nd-text-muted/15 bg-nd-surface/40 p-4 transition hover:border-nd-accent/25">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-nd-accent/25 bg-nd-accent/10 text-nd-accent">
          <Plug className="h-5 w-5" />
        </div>
        <Badge tone={statusTone[plugin.status]}>{plugin.status}</Badge>
      </div>

      <h3 className="mt-4 font-semibold text-nd-text">{plugin.name}</h3>
      <p className="mt-2 text-sm leading-6 text-nd-text-muted">{plugin.description}</p>

      <div className="mt-4 space-y-2">
        {plugin.permissions.map((perm) => (
          <div key={perm} className="flex items-center gap-2 rounded-xl border border-nd-text-muted/15 bg-nd-surface/30 px-3 py-2 text-xs text-nd-text-muted">
            <ShieldAlert className="h-3.5 w-3.5 text-nd-warning" /> {perm}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onToggle(plugin.id)}
        className="mt-4 w-full rounded-xl border border-nd-accent/25 bg-nd-accent/10 px-3 py-2 text-sm font-semibold text-nd-accent transition hover:bg-nd-accent/15"
      >
        {plugin.status === 'enabled' ? 'Disable' : 'Enable'} Plugin
      </button>
    </article>
  );
}
