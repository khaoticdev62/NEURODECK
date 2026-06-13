import { spawnSync } from "child_process";
import { platform } from "os";

const VPN_IFACE_PATTERNS = [
  /tun/i,
  /wg/i,
  /ovpn/i,
  /ppp/i,
  /nord/i,
  /surf/i,
  /proton/i,
  /mullvad/i,
  /wireguard/i,
  /openvpn/i,
  /vpn/i,
];

export interface DefaultRouteInfo {
  name: string;
  nextHop?: string;
}

export function getDefaultRouteInterface(): DefaultRouteInfo | null {
  const p = platform();
  try {
    if (p === "win32") {
      const result = spawnSync(
        "powershell",
        [
          "-Command",
          "Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric | Select-Object -First 1 | Format-List InterfaceAlias,NextHop",
        ],
        { encoding: "utf-8", timeout: 5000 }
      );
      const out = result.stdout || "";
      const iface = /InterfaceAlias\s*:\s*(.+)/.exec(out)?.[1]?.trim();
      const nextHop = /NextHop\s*:\s*(.+)/.exec(out)?.[1]?.trim();
      if (iface) return { name: iface, nextHop };
      return null;
    }

    const ipResult = spawnSync("ip", ["route", "show", "default"], {
      encoding: "utf-8",
      timeout: 5000,
    });
    const line = (ipResult.stdout || "").split("\n")[0];
    const m = /default.*dev\s+(\S+)/.exec(line);
    if (m) return { name: m[1] };

    const netstat = spawnSync("netstat", ["-rn", "-f", "inet"], {
      encoding: "utf-8",
      timeout: 5000,
    });
    const rows = netstat.stdout?.split("\n") ?? [];
    for (const row of rows) {
      const parts = row.trim().split(/\s+/);
      if (parts[0] === "default" && parts.length >= 6) {
        return { name: parts[3] };
      }
    }
  } catch {
    /* ignore probe failures */
  }
  return null;
}

export function isVpnInterface(iface?: string): boolean {
  if (!iface) return false;
  return VPN_IFACE_PATTERNS.some((pattern) => pattern.test(iface));
}
