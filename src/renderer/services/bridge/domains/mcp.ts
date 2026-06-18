import { bridgeInvoke } from "../http";

export interface McpStatus {
  running: boolean;
  port: number;
  token?: string;
  endpoint?: string;
  discovery?: string;
}

export const mcp = {
  async getStatus(): Promise<McpStatus> {
    return bridgeInvoke<McpStatus>("get_mcp_status");
  },
  async start(port = 13337): Promise<{ port: number; token: string; discovery: string }> {
    return bridgeInvoke<{ port: number; token: string; discovery: string }>("start_mcp_server", {
      port,
    });
  },
  async stop(): Promise<{ status: string }> {
    return bridgeInvoke<{ status: string }>("stop_mcp_server");
  },
  async getToolWhitelist(): Promise<string[]> {
    return bridgeInvoke<string[]>("get_mcp_tool_whitelist");
  },
  async setToolWhitelist(tools: string[]): Promise<{ status: string }> {
    return bridgeInvoke<{ status: string }>("set_mcp_tool_whitelist", { tools });
  },
};
