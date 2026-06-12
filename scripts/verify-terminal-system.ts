import fs from "fs";
import path from "path";

const requiredFiles = [
  "src-tauri/src/pty_manager.rs",
  "src-tauri/src/terminal.rs",
  "src/shared/terminal/terminalContracts.ts",
  "src/shared/terminal/terminalCommandPolicy.ts",
  "frontend/src/react/features/terminal/TerminalScreen.tsx",
  "frontend/src/react/features/terminal/TerminalViewport.tsx",
  "frontend/src/react/services/bridgeAdapter.ts",
];

let failures = 0;
for (const rel of requiredFiles) {
  const abs = path.resolve(__dirname, "..", rel);
  if (!fs.existsSync(abs)) {
    console.error(`[FAIL] Missing ${rel}`);
    failures++;
  } else {
    console.log(`[PASS] ${rel}`);
  }
}

if (failures > 0) process.exit(1);
console.log("Terminal system inventory looks present.");

