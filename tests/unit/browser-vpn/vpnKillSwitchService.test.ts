import { describe, expect, it } from "vitest";
import { vpnKillSwitchService } from "../../../src/main/services/browser-vpn/vpnKillSwitchService";

describe("vpnKillSwitchService", () => {
  it("blocks when the route is inactive", () => {
    vpnKillSwitchService.setState("vpn-test", "disconnected", true, "test");
    expect(vpnKillSwitchService.isBlocked("vpn-test")).toBe(true);
    vpnKillSwitchService.setState("vpn-test", "connected", true, "test");
    expect(vpnKillSwitchService.isBlocked("vpn-test")).toBe(false);
  });
});

