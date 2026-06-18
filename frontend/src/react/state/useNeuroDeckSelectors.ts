import { useMemo } from "react";
import type { NeuroDeckState } from "../types/neurodeck";

export interface NeuroDeckSelectors {
  activeAgents: number;
  readyModels: number;
  pinnedMemories: number;
  enabledPlugins: number;
  riskCount: number;
  messageCount: number;
  completedRuns: number;
}

export function useNeuroDeckSelectors(state: NeuroDeckState): NeuroDeckSelectors {
  return useMemo(
    () => ({
      activeAgents: state.agents.filter((agent) => agent.status === "thinking").length,
      readyModels: state.models.filter(
        (model) => model.status === "ready" || model.status === "indexed"
      ).length,
      pinnedMemories: state.memories.filter((memory) => memory.pinned).length,
      enabledPlugins: state.plugins.filter((plugin) => plugin.status === "enabled").length,
      riskCount: state.activeProject?.risks.length ?? 0,
      messageCount: state.messages.length,
      completedRuns: state.aiRuns.filter((run) => run.status === "complete").length,
    }),
    [
      state.activeProject?.risks.length,
      state.agents,
      state.aiRuns,
      state.memories,
      state.messages.length,
      state.models,
      state.plugins,
    ]
  );
}
