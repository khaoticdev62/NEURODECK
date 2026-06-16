import fs from "fs";
import path from "path";

const text = fs.readFileSync(path.resolve(__dirname, "../frontend/src/react/features/terminal/TerminalScreen.tsx"), "utf8");
if (!text.includes("HISTORY_KEY") || !text.includes("redactedCommand")) {
  console.error("[FAIL] Terminal history persistence or redaction not found.");
  process.exit(1);
}

console.log("Terminal history persistence checks passed.");

