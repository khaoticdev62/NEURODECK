import assert from "assert";
import { vpnConfigImportService } from "../../src/main/services/browser-vpn/vpnConfigImportService";
import { vpnProfileService } from "../../src/main/services/browser-vpn/vpnProfileService";
import { vpnProviderAdapterRegistry } from "../../src/main/services/browser-vpn/vpnProviderAdapterRegistry";
import { vpnRedactionService } from "../../src/main/services/browser-vpn/vpnRedactionService";
import { VPN_CONFIG_TEMPLATES } from "../../src/shared/browser-vpn/vpnConfigTemplates";

const templates = VPN_CONFIG_TEMPLATES;
assert.ok(templates.length > 0, "Expected VPN templates to exist");

const profile = vpnProfileService.createProfile({
  name: "Script Smoke Profile",
  providerName: "Script Smoke",
  routeMode: "browser_proxy",
  protocol: "http_proxy",
});
assert.ok(profile.id, "Expected a created VPN profile");

const redacted = vpnRedactionService.redactText("PrivateKey = abc\npassword=secret");
assert.ok(!redacted.includes("secret"), "Secrets must be redacted");

const matrix = vpnProviderAdapterRegistry.getProviderSupport("Script Smoke", "browser_proxy", "http_proxy");
assert.ok(matrix.status, "Provider support matrix should return a status");

const imported = vpnConfigImportService.importText(templates[0].configText, templates[0].routeMode === "browser_proxy" ? "proxy" : templates[0].protocol as any);
assert.ok(imported.ok, `Expected template import to succeed: ${imported.ok ? "ok" : imported.error}`);

console.log(JSON.stringify({
  ok: true,
  templates: templates.length,
  profileId: profile.id,
  providerStatus: matrix.status,
}, null, 2));

