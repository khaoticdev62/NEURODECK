import type { Dispatch } from 'react';
import { Panel } from '../../components/primitives/Panel';
import { PluginCard } from '../../components/cards/PluginCard';
import type { NeuroDeckAction, NeuroDeckState } from '../../types/neurodeck';

export function PluginsView({ state, dispatch }: { state: NeuroDeckState; dispatch: Dispatch<NeuroDeckAction> }) {
  return (
    <Panel eyebrow="Plugin Manager" title="Extension Permissions" className="h-full overflow-hidden">
      <div className="grid gap-4 overflow-y-auto p-4 scrollbar-thin lg:grid-cols-3">
        {state.plugins.map((plugin) => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            onToggle={(id) => dispatch({ type: 'toggle-plugin', id })}
          />
        ))}
      </div>
    </Panel>
  );
}
