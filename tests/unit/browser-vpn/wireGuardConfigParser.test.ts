import { describe, expect, it } from "vitest";
import { parseWireGuardConfig } from "../../../src/main/services/browser-vpn/wireGuardConfigParser";

describe("parseWireGuardConfig", () => {
  it("parses a valid wireguard profile", () => {
    const result = parseWireGuardConfig(`[Interface]
PrivateKey = abc
Address = 10.8.0.2/32
DNS = 1.1.1.1

[Peer]
PublicKey = def
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0, ::/0`);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.protocol).toBe("wireguard");
      expect(result.routeMode).toBe("system_tunnel");
      expect(result.warnings).toContain("AllowedIPs includes 0.0.0.0/0, which is a full tunnel.");
    }
  });
});

