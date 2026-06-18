import { bridgeInvoke } from "../http";

export const voice = {
  async start(): Promise<{ ok: boolean }> {
    try {
      await bridgeInvoke<string>("start_recording");
      return { ok: true };
    } catch (_) {
      return { ok: false };
    }
  },
  async stop(): Promise<{ transcript: string }> {
    try {
      const result = await bridgeInvoke<string>("stop_recording");
      return { transcript: typeof result === "string" ? result : "" };
    } catch (_) {
      return { transcript: "" };
    }
  },
};
