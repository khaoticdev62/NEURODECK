import { TERMINAL_PROFILES } from "../src/shared/terminal/terminalProfiles";

if (!TERMINAL_PROFILES.length) {
  throw new Error("No terminal profiles found");
}

const missing = TERMINAL_PROFILES.filter((profile) => !profile.id || !profile.shellPath);
if (missing.length > 0) {
  throw new Error("Terminal profiles must define id and shellPath");
}

console.log(`Validated ${TERMINAL_PROFILES.length} terminal profiles.`);

