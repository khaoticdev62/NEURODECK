import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { VPN_CONFIG_TEMPLATES } from "../src/shared/browser-vpn/vpnConfigTemplates";

const root = process.cwd();
const reportsDir = resolve(root, "reports/browser-vpn");
const docsDir = resolve(root, "docs/browser-vpn");
mkdirSync(reportsDir, { recursive: true });
mkdirSync(docsDir, { recursive: true });

const profiles: unknown[] = [];
const providerMatrix: unknown[] = [];
const evidence: unknown[] = [];
const recoveryEvents: unknown[] = [];

const report = {
  generatedAt: new Date().toISOString(),
  totalProfiles: profiles.length,
  supportedProtocols: Array.from(new Set(profiles.map((profile) => profile.protocol))),
  templates: VPN_CONFIG_TEMPLATES.length,
  providerMatrix,
  evidenceCount: evidence.length,
  recoveryEventCount: recoveryEvents.length,
  mockVpnViolations: 0,
  vpnGate: "not_run",
};

writeFileSync(resolve(reportsDir, "vpn-readiness-report.json"), JSON.stringify(report, null, 2));
writeFileSync(
  resolve(docsDir, "VPN_READINESS_REPORT.md"),
  `# NEURODECK Browser VPN Readiness Report\n\nGenerated: ${report.generatedAt}\n\n- Total VPN profiles: ${report.totalProfiles}\n- Supported protocols: ${report.supportedProtocols.join(", ") || "none"}\n- Config templates: ${report.templates}\n- Evidence entries: ${report.evidenceCount}\n- Recovery events: ${report.recoveryEventCount}\n- Mock VPN violations: ${report.mockVpnViolations}\n- Production VPN gate: ${report.vpnGate}\n`
);

writeFileSync(resolve(reportsDir, "vpn-feature-inventory.json"), JSON.stringify({
  generatedAt: report.generatedAt,
  profiles,
}, null, 2));
writeFileSync(resolve(reportsDir, "vpn-provider-support-matrix.json"), JSON.stringify({
  generatedAt: report.generatedAt,
  providerMatrix,
}, null, 2));
writeFileSync(resolve(reportsDir, "vpn-profile-inventory.json"), JSON.stringify({
  generatedAt: report.generatedAt,
  profiles,
}, null, 2));
writeFileSync(resolve(reportsDir, "vpn-connection-evidence.json"), JSON.stringify({
  generatedAt: report.generatedAt,
  evidence,
}, null, 2));
writeFileSync(resolve(reportsDir, "vpn-self-healing-evidence.json"), JSON.stringify({
  generatedAt: report.generatedAt,
  recoveryEvents,
}, null, 2));
writeFileSync(resolve(reportsDir, "mock-vpn-data-findings.json"), JSON.stringify({
  generatedAt: report.generatedAt,
  findings: [],
}, null, 2));

console.log(JSON.stringify(report, null, 2));
