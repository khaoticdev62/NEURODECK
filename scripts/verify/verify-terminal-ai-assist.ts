import fs from "fs";
import path from "path";

const text = fs.readFileSync(path.resolve(__dirname, "../../src/renderer/features/terminal/TerminalScreen.tsx"), "utf8");
if (!text.includes("Assistant") || !text.includes("Suggest Commands") || !text.includes("Explain Last Command")) {
  console.error("[FAIL] AI assist UI is missing required controls.");
  process.exit(1);
}

console.log("Terminal AI assist hooks are present.");

