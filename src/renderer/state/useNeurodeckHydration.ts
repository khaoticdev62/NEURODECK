import { useEffect } from "react";
import { neurodeckApi } from "../services/bridgeAdapter";
import { STORE_KEY } from "../types/seed";
import type { NeuroDeckAction, NeuroDeckState, PluginCard } from "../types/neurodeck";

export function useNeurodeckHydration(dispatch: React.Dispatch<NeuroDeckAction>) {
  useEffect(() => {
    let mounted = true;
    async function hydrate() {
      const stored = (await neurodeckApi.store.get<Partial<NeuroDeckState>>(STORE_KEY)) || {};

      // All backend calls run in parallel — fastest possible hydration time.
      const [initRes, statusRes, memsRes, sessRes, agentsRes, pluginsRes] =
        await Promise.allSettled([
          neurodeckApi.getInitialState(),
          neurodeckApi.getStatusBarState(),
          neurodeckApi.memory.list(),
          neurodeckApi.sessions.listMeta(),
          neurodeckApi.agents.list(),
          neurodeckApi.plugins.list(),
        ]);

      if (initRes.status === "fulfilled" && initRes.value) {
        const init = initRes.value;
        stored.selectedProvider = (init.provider as any) || stored.selectedProvider;
        stored.selectedModelId = init.model || stored.selectedModelId;
        stored.selectedPersona = init.active_persona || stored.selectedPersona;
        stored.toolStatus = init.tool_status ?? stored.toolStatus;
      }

      if (statusRes.status === "fulfilled" && statusRes.value) {
        stored.statusBar = statusRes.value;
      }

      if (memsRes.status === "fulfilled") {
        const mems = memsRes.value;
        if (mems?.records) {
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
      }

      if (sessRes.status === "fulfilled") {
        const sessList = sessRes.value;
        if (sessList && sessList.length > 0) stored.sessions = sessList;
      }

      if (agentsRes.status === "fulfilled") {
        const agentList = agentsRes.value;
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
      }

      if (pluginsRes.status === "fulfilled") {
        const pluginList = pluginsRes.value;
        if (pluginList?.plugins) {
          stored.plugins = pluginList.plugins.map((p) => {
            const status: PluginCard["status"] = p.enabled ? "enabled" : "disabled";
            return {
              id: p.id || p.file_name,
              name: p.name,
              description: p.description || "",
              status,
              permissions: p.permissions || [],
            };
          });
        }
      }

      if (mounted) dispatch({ type: "hydrate", payload: stored });
    }
    hydrate().catch(() => dispatch({ type: "hydrate", payload: null }));
    return () => {
      mounted = false;
    };
  }, [dispatch]);
}
