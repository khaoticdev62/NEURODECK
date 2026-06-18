import { bridgeInvoke } from "../http";

export const tunnel = {
  async start() {
    return bridgeInvoke<{ success: boolean }>("start_tunnel_server");
  },
  async stop() {
    return bridgeInvoke<{ success: boolean }>("stop_tunnel_server");
  },
  async sendRequest(command: string) {
    return bridgeInvoke<{ output: string }>("send_tunnel_request", { command });
  },
};
