import assert from "assert";
import { vpnKillSwitchService } from "../src/main/services/browser-vpn/vpnKillSwitchService";

vpnKillSwitchService.setState("profile-a", "disconnected", true, "test");
assert.strictEqual(vpnKillSwitchService.isBlocked("profile-a"), true);
vpnKillSwitchService.setState("profile-a", "connected", true, "test");
assert.strictEqual(vpnKillSwitchService.isBlocked("profile-a"), false);

console.log(JSON.stringify({ ok: true, state: vpnKillSwitchService.getState("profile-a") }, null, 2));

