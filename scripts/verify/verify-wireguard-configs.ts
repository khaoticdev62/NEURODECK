import assert from "assert";
import { parseWireGuardConfig } from "../../src/main/services/browser-vpn/wireGuardConfigParser";
import { vpnRedactionService } from "../../src/main/services/browser-vpn/vpnRedactionService";
import { VPN_CONFIG_TEMPLATES } from "../../src/shared/browser-vpn/vpnConfigTemplates";

const template = VPN_CONFIG_TEMPLATES.find((item) => item.protocol === "wireguard");
assert.ok(template, "WireGuard template missing");

const parsed = parseWireGuardConfig(template.configText);
assert.ok(parsed.ok, parsed.ok ? "parsed" : parsed.error);
assert.ok(parsed.redactedSummary.length > 0, "WireGuard redacted summary should exist");

const redacted = vpnRedactionService.redactText(template.configText);
assert.ok(!redacted.includes("PASTE_PRIVATE_KEY_HERE"), "WireGuard secrets must be redacted");

console.log(JSON.stringify({ ok: true, warnings: parsed.ok ? parsed.warnings : [] }, null, 2));

