import fs from "fs";
import path from "path";

const source = fs.readFileSync(path.resolve(__dirname, "../src-tauri/src/pty_manager.rs"), "utf8");
const checks = [
  ["pty_spawn", "spawn path exists"],
  ["pty_write", "write path exists"],
  ["pty_resize", "resize path exists"],
  ["pty_kill", "kill path exists"],
  ["bytes_in", "input byte tracking exists"],
  ["bytes_out", "output byte tracking exists"],
];

let failures = 0;
for (const [needle, label] of checks) {
  if (source.includes(needle)) {
    console.log(`[PASS] ${label}`);
  } else {
    console.error(`[FAIL] ${label}`);
    failures++;
  }
}

if (failures > 0) process.exit(1);

