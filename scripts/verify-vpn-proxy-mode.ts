import assert from "assert";
import { parseProxyConfig } from "../src/main/services/browser-vpn/proxyConfigParser";

const parsed = parseProxyConfig(JSON.stringify({
  name: "Proxy",
  protocol: "socks5",
  host: "proxy.example.com",
  port: 1080,
  proxyDns: true,
}));

assert.ok(parsed.ok, parsed.ok ? "parsed" : parsed.error);
assert.strictEqual(parsed.ok ? parsed.routeMode : null, "browser_proxy");

console.log(JSON.stringify({ ok: true, warnings: parsed.ok ? parsed.warnings : [] }, null, 2));

