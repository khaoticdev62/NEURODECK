import { describe, expect, it } from "vitest";
import { parseOpenVpnConfig } from "../../../src/main/services/browser-vpn/openVpnConfigParser";

describe("parseOpenVpnConfig", () => {
  it("parses a valid openvpn profile", () => {
    const result = parseOpenVpnConfig(`client
dev tun
proto udp
remote vpn.example.com 1194
auth-user-pass
auth-nocache

<ca>
-----BEGIN CERTIFICATE-----
ABC
-----END CERTIFICATE-----
</ca>`);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.protocol).toBe("openvpn");
      expect(result.routeMode).toBe("system_tunnel");
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    }
  });
});

