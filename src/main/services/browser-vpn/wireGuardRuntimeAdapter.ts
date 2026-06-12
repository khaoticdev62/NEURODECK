import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { app } from "electron";

type RuntimeRecord = {
  process: ChildProcessWithoutNullStreams;
  configPath: string;
  startedAt: string;
};

export class WireGuardRuntimeAdapter {
  private runtimes = new Map<string, RuntimeRecord>();

  private runtimeDir(): string {
    return path.join(app.getPath("userData"), "browser-vpn-runtime");
  }

  prepareConfig(profileId: string, configText: string): string {
    const dir = this.runtimeDir();
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${profileId}.conf`);
    fs.writeFileSync(filePath, configText, "utf-8");
    return filePath;
  }

  connect(profileId: string, configPath: string): { ok: boolean; error?: string; pid?: number } {
    try {
      const child = spawn("wg-quick", ["up", configPath], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      this.runtimes.set(profileId, { process: child, configPath, startedAt: new Date().toISOString() });
      child.on("exit", () => {
        this.runtimes.delete(profileId);
      });
      return { ok: true, pid: child.pid ?? undefined };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  }

  disconnect(profileId: string): { ok: boolean; error?: string } {
    const runtime = this.runtimes.get(profileId);
    if (!runtime) return { ok: true };
    try {
      runtime.process.kill("SIGTERM");
      this.runtimes.delete(profileId);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  }

  status(profileId: string): "running" | "stopped" {
    return this.runtimes.has(profileId) ? "running" : "stopped";
  }
}

export const wireGuardRuntimeAdapter = new WireGuardRuntimeAdapter();
