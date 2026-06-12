import { describe, expect, it } from "vitest";
import { VPN_CONFIG_TEMPLATES } from "../../../src/shared/browser-vpn/vpnConfigTemplates";

describe("vpn contracts", () => {
  it("exposes template data", () => {
    expect(VPN_CONFIG_TEMPLATES.length).toBeGreaterThan(0);
    expect(VPN_CONFIG_TEMPLATES[0].configText.length).toBeGreaterThan(0);
  });
});

