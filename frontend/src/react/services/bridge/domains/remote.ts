import { bridgeInvoke } from "../http";
import { listenBridge } from "../transport";

export interface RemoteNotificationPayload {
  title: string;
  text: string;
  type?: "info" | "success" | "warn" | "error";
}

export const remote = {
  async start(port: number = 9090) {
    return bridgeInvoke<{ success: boolean; url?: string; pin?: string }>("start_remote_server", {
      port,
    });
  },
  async stop() {
    return bridgeInvoke<{ success: boolean }>("stop_remote_server");
  },
  async getInfo() {
    return bridgeInvoke<{
      running: boolean;
      url?: string;
      clients?: number;
      pin?: string;
      ip?: string;
      port?: number;
      ttl_seconds_remaining?: number;
    }>("get_remote_server_info");
  },
  async pushNotification(payload: RemoteNotificationPayload) {
    return bridgeInvoke<{ status: string }>("remote_relay_notification", { payload });
  },
  onClientConnected(handler: (count: number) => void): () => void {
    return listenBridge("remote_client_connected", (p: unknown) => handler(p as number));
  },
  onClientDisconnected(handler: (count: number) => void): () => void {
    return listenBridge("remote_client_disconnected", (p: unknown) => handler(p as number));
  },
  onChat(handler: (text: string) => void): () => void {
    return listenBridge("remote_chat", (p: unknown) => handler(p as string));
  },
  onNavigate(handler: (view: string) => void): () => void {
    return listenBridge("remote_navigate", (p: unknown) => handler(p as string));
  },
};
