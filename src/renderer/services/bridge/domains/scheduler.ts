import { bridgeInvoke } from "../http";

export interface ScheduledTask {
  id: string;
  name: string;
  cron: string;
  goal: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
}

export const scheduler = {
  async listTasks(): Promise<ScheduledTask[]> {
    return bridgeInvoke<ScheduledTask[]>("list_scheduled_tasks");
  },
  async addTask(task: Omit<ScheduledTask, "id">): Promise<ScheduledTask> {
    return bridgeInvoke<ScheduledTask>("add_scheduled_task", task);
  },
  async deleteTask(id: string) {
    return bridgeInvoke<{ success: boolean }>("delete_scheduled_task", { id });
  },
  async toggleTask(id: string) {
    return bridgeInvoke<{ success: boolean; enabled: boolean }>("toggle_scheduled_task", { id });
  },
  async runTaskNow(id: string) {
    return bridgeInvoke<{ success: boolean }>("run_task_now", { id });
  },
};
