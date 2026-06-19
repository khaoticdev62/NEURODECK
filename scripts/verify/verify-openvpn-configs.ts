import assert from "assert";
import { parseOpenVpnConfig } from "../../src/main/services/browser-vpn/openVpnConfigParser";
import { vpnRedactionService } from "../../src/main/services/browser-vpn/vpnRedactionService";
import { VPN_CONFIG_TEMPLATES } from "../../src/shared/browser-vpn/vpnConfigTemplates";

const template = VPN_CONFIG_TEMPLATES.find((item) => item.protocol === "openvpn");
assert.ok(template, "OpenVPN template missing");

const parsed = parseOpenVpnConfig(template.configText);
assert.ok(parsed.ok, parsed.ok ? "parsed" : parsed.error);
assert.ok(parsed.redactedSummary.includes("[REDACTED]") || parsed.redactedSummary.length > 0, "Redacted summary should exist");

const redacted = vpnRedactionService.redactText(template.configText);
assert.ok(!redacted.includes("PASTE_CLIENT_PRIVATE_KEY_HERE"), "OpenVPN secrets must be redacted");

console.log(JSON.stringify({ ok: true, warnings: parsed.ok ? parsed.warnings : [] }, null, 2));

