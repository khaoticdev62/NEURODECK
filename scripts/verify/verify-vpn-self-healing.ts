import assert from "assert";
import { vpnSelfHealingService } from "../../src/main/services/browser-vpn/vpnSelfHealingService";

async function main() {
  const event = await vpnSelfHealingService.recover("profile-a", "degraded", "test");
  assert.ok(event.status === "passed" || event.status === "blocked");
  console.log(JSON.stringify({ ok: true, event }, null, 2));
}

void main();
