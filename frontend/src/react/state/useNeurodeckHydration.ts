import { useEffect } from "react";
import { neurodeckApi } from "../services/bridgeAdapter";
import { STORE_KEY } from "../types/seed";
import type { NeuroDeckAction, NeuroDeckState, PluginCard } from "../types/neurodeck";

export function useNeurodeckHydration(dispatch: React.Dispatch<NeuroDeckAction>) {
  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const stored = (await neurodeckApi.store.get<Partial<NeuroDeckState>>(STORE_KEY)) || {};

      // 1. Fetch live backend initial settings
      try {
        const init = await neurodeckApi.getInitialState();
        if (init) {
          stored.selectedProvider = (init.provider as any) || stored.selectedProvider;
          stored.selectedModelId = init.model || stored.selectedModelId;
          stored.selectedPersona = init.active_persona || stored.selectedPersona;
          stored.toolStatus = init.tool_status ?? stored.toolStatus;
        }
      } catch (_) {
        // Ignored, fallback to stored/initial
      }

      // 1b. Fetch consolidated status-bar state
      try {
        const status = await neurodeckApi.getStatusBarState();
        if (status) {
          stored.statusBar = status;
        }
      } catch (_) {
        // Ignored, fallback to stored/initial
      }

      // 2. Fetch live memory records
      try {
        const mems = await neurodeckApi.memory.list();
        if (mems && mems.records) {
          stored.memories = mems.records.map((r: any) => ({
            id: r.id,
            title: r.metadata?.title || r.content.slice(0, 40),
            body: r.content,
            scope: (r.metadata?.scope as any) || "Global",
            pinned: r.metadata?.pinned === "true",
            updatedAt: r.metadata?.updatedAt || "local cache",
            sourceFile: r.metadata?.path || undefined,
            namespace: r.metadata?.namespace || r.metadata?.source || undefined,
          }));
        }
      } catch (_) {
        // Ignored, fallback to stored/initial
      }

      // 3. Fetch live sessions metadata
      try {
        const sessList = await neurodeckApi.sessions.listMeta();
        if (sessList && sessList.length > 0) {
          stored.sessions = sessList;
        }
      } catch (_) {
        // Ignored, fallback to stored/initial
      }

      // 4. Fetch live agents
      try {
        const agentList = await neurodeckApi.agents.list();
        if (agentList && agentList.length > 0) {
          stored.agents = agentList.map((a) => ({
            id: a.id,
            name: a.name,
            role: a.description || "Specialized operator",
            status: "idle",
            model: a.model || "default",
            memoryAccess: "project",
            lastAction: "Ready",
            task: "Ready",
          }));
        }
      } catch (_) {
        // Ignored, fallback to stored/initial
      }

      // 5. Fetch live plugins
      try {
        const pluginList = await neurodeckApi.plugins.list();
        if (pluginList && pluginList.plugins) {
          stored.plugins = pluginList.plugins.map((p) => {
            let status: PluginCard["status"] = "disabled";
            if (p.enabled) status = "enabled";
            return {
              id: p.id || p.file_name,
              name: p.name,
              description: p.description || "",
              status,
              permissions: p.permissions || [],
            };
          });
        }
      } catch (_) {
        // Ignored, fallback to stored/initial
      }

      if (mounted) dispatch({ type: "hydrate", payload: stored });
    }
    hydrate().catch(() => dispatch({ type: "hydrate", payload: null }));
    return () => {
      mounted = false;
    };
  }, [dispatch]);
}
