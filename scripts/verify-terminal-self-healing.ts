import fs from "fs";
import path from "path";

const terminal = fs.readFileSync(path.resolve(__dirname, "../src-tauri/src/pty_manager.rs"), "utf8");
if (!terminal.includes("SPAWN_TIMEOUT_SECS") || !terminal.includes("MAX_SESSION_LIFETIME_SECS")) {
  console.error("[FAIL] PTY recovery timing constants missing.");
  process.exit(1);
}

console.log("Self-healing-related PTY safeguards are present.");

