import { spawnSync } from "child_process";

export class VpnNetworkManagerAdapter {
  detect(): boolean {
    const result = spawnSync("nmcli", ["--version"], { encoding: "utf-8" });
    return !result.error;
  }

  importConnection(configPath: string, type: "openvpn" | "wireguard"): { ok: boolean; connectionId?: string; error?: string } {
    const importType = type === "openvpn" ? "openvpn" : "wireguard";
    const result = spawnSync("nmcli", ["connection", "import", "type", importType, "file", configPath], {
      encoding: "utf-8",
    });
    if (result.error || result.status !== 0) {
      return { ok: false, error: result.stderr || result.error?.message || "nmcli_import_failed" };
    }
    const match = /Connection\s+'([^']+)'/i.exec(result.stdout || "");
    return { ok: true, connectionId: match?.[1] };
  }

  up(connectionId: string): { ok: boolean; error?: string } {
    const result = spawnSync("nmcli", ["connection", "up", connectionId], { encoding: "utf-8" });
    if (result.error || result.status !== 0) {
      return { ok: false, error: result.stderr || result.error?.message || "nmcli_up_failed" };
    }
    return { ok: true };
  }

  down(connectionId: string): { ok: boolean; error?: string } {
    const result = spawnSync("nmcli", ["connection", "down", connectionId], { encoding: "utf-8" });
    if (result.error || result.status !== 0) {
      return { ok: false, error: result.stderr || result.error?.message || "nmcli_down_failed" };
    }
    return { ok: true };
  }
}

export const vpnNetworkManagerAdapter = new VpnNetworkManagerAdapter();
