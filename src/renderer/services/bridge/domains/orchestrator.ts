import { bridgeInvoke } from "../http";

export const orchestrator = {
  async startTask(goal: string) {
    return bridgeInvoke<{ task_id: string }>("start_orchestrated_task", { goal });
  },
  async getStatus(taskId: string) {
    return bridgeInvoke<{ status: string; steps: unknown[] }>("get_orchestration_status", {
      task_id: taskId,
    });
  },
  async stop(taskId: string) {
    return bridgeInvoke<{ success: boolean }>("stop_orchestration", { task_id: taskId });
  },
};
