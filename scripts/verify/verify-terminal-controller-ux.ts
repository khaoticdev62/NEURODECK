import fs from "fs";
import path from "path";

const source = fs.readFileSync(path.resolve(__dirname, "../../src/shared/terminal/terminalControllerMap.ts"), "utf8");
const required = ["open-command-palette", "open-ai-assistant", "focus-input", "split-pane", "confirm"];
const missing = required.filter((needle) => !source.includes(needle));

if (missing.length > 0) {
  console.error(`[FAIL] Missing controller actions: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Controller action map looks complete.");
