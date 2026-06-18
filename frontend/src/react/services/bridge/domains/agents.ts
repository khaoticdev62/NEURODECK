import type { AgentRunRequest, AgentRunResponse, AIRunStatus } from "../../../types/neurodeck";
import { bridgeInvoke } from "../http";

export const agents = {
  async run(payload: AgentRunRequest): Promise<AgentRunResponse> {
    try {
      const result = await bridgeInvoke<{ status: string; output?: string; error?: string }>(
        "agent_step",
        {
          agent_id: payload.agentId,
          prompt: payload.prompt,
        }
      );
      const run = {
        id: `agent-${Date.now()}`,
        agentId: payload.agentId,
        agentName: payload.agentName,
        status: (result.error ? "failed" : "complete") as AIRunStatus,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        provider: payload.provider,
        model: payload.model,
        prompt: payload.prompt,
        result: result.output || "",
        error: result.error,
        usedProjectContext: Boolean(payload.projectContext),
      };
      if (result.error) {
        return { ok: false, run, error: result.error };
      }
      return { ok: true, run };
    } catch (e) {
      const run = {
        id: `agent-failed-${Date.now()}`,
        agentId: payload.agentId,
        agentName: payload.agentName,
        status: "failed" as const,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        provider: payload.provider,
        model: payload.model,
        prompt: payload.prompt,
        error: String(e),
        usedProjectContext: Boolean(payload.projectContext),
      };
      return { ok: false, run, error: String(e) };
    }
  },
  async list() {
    return bridgeInvoke<
      Array<{ id: string; name: string; provider: string; model: string; description: string }>
    >("list_agents");
  },
  async getActiveId() {
    return bridgeInvoke<{ active_agent_id: string }>("get_active_agent_id");
  },
  async switchAgent(id: string) {
    return bridgeInvoke<{
      status: string;
      id: string;
      name: string;
      provider: string;
      model: string;
    }>("switch_agent", { id });
  },
};
