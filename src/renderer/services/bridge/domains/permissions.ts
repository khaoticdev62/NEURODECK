import { bridgeInvoke } from "../http";

export type PermissionProfile = {
  id: string;
  name: string;
  description: string;
  granted: string[];
  created_at: string;
};

export type PermissionRegistry = {
  profiles: PermissionProfile[];
  default_profile_id: string;
  agent_profile_map: Record<string, string>;
};

export type AgentPermissionProfile = {
  agent_id: string;
  profile_id: string;
  explicit: boolean;
};

export const permissions = {
  async listProfiles(): Promise<PermissionRegistry> {
    return bridgeInvoke<PermissionRegistry>("list_permission_profiles");
  },
  async getAgentProfile(agentId: string): Promise<AgentPermissionProfile> {
    return bridgeInvoke<AgentPermissionProfile>("get_agent_permission_profile", {
      agent_id: agentId,
    });
  },
  async setAgentProfile(agentId: string, profileId: string | null): Promise<{ status: string }> {
    return bridgeInvoke<{ status: string }>("set_agent_permission_profile", {
      agent_id: agentId,
      profile_id: profileId,
    });
  },
};
