import { bridgeInvoke } from "../http";

export interface DashboardStats {
  sessions_total: number;
  messages_total: number;
  memory_total: number;
  memory_pinned: number;
  projects_total: number;
  packs_total: number;
  provider: string;
  model: string;
  db_size_bytes: number;
  privacy_breakdown: {
    standard: number;
    private: number;
    sensitive: number;
    sealed: number;
  };
  recent_sessions: {
    id: string;
    name?: string;
    created_at: string;
    message_count: number;
  }[];
}

export const dashboard = {
  async stats(): Promise<DashboardStats> {
    return bridgeInvoke<DashboardStats>("get_dashboard_stats");
  },
};
