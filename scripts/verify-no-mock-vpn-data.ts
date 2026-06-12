import assert from "assert";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const patterns = [
  /mockVpn/i,
  /fakeVpn/i,
  /demoVpn/i,
  /fakePublicIp/i,
  /fakeLocation/i,
  /hardcoded VPN connected/i,
];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const results: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
      results.push(...walk(fullPath));
    } else if (/\.(ts|tsx|js)$/.test(entry)) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk("src");
const findings: Array<{ file: string; pattern: string }> = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.test(text)) findings.push({ file, pattern: pattern.source });
  }
}

assert.strictEqual(findings.length, 0, `Mock VPN data found: ${JSON.stringify(findings, null, 2)}`);
console.log(JSON.stringify({ ok: true, findings }, null, 2));
