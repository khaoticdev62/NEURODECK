import fs from "fs";
import path from "path";

const terminalRenderer = fs.readFileSync(path.resolve(__dirname, "../../src/renderer/features/terminal/TerminalScreen.tsx"), "utf8");
const forbidden = ["child_process", "node-pty", "process.env", "ipcRenderer", "spawn("];
const hits = forbidden.filter((needle) => terminalRenderer.includes(needle));

if (hits.length > 0) {
  console.error(`[FAIL] Forbidden renderer imports or execution paths found: ${hits.join(", ")}`);
  process.exit(1);
}

console.log("Terminal renderer security scan passed.");

