import fs from "fs";
import path from "path";

const terminalPaths = [
  "frontend/src/react/features/terminal/TerminalScreen.tsx",
  "frontend/src/react/features/terminal/TerminalViewport.tsx",
  "src-tauri/src/pty_manager.rs",
  "src-tauri/src/terminal.rs",
];

const patterns = [
  "mockTerminal",
  "fakeTerminal",
  "demoTerminal",
  "sampleTerminal",
  "placeholderTerminal",
  "mockOutput",
  "fakeOutput",
  "fakeShell",
  "fakeCommand",
  "hardcoded stdout",
  "hardcoded stderr",
];

let failures = 0;
for (const rel of terminalPaths) {
  const text = fs.readFileSync(path.resolve(__dirname, "..", rel), "utf8");
  const found = patterns.filter((p) => text.includes(p));
  if (found.length > 0) {
    console.error(`[FAIL] ${rel}: ${found.join(", ")}`);
    failures++;
  } else {
    console.log(`[PASS] ${rel}`);
  }
}

if (failures > 0) process.exit(1);

