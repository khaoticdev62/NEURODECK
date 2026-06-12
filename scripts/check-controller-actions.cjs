const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const typesPath = path.join(root, "frontend", "src", "shared", "types", "controller.ts");
const mapperPath = path.join(root, "frontend", "src", "react", "input", "controller", "gamepadMapper.ts");
const providerPath = path.join(root, "frontend", "src", "react", "input", "controller", "ControllerProvider.tsx");

const types = fs.readFileSync(typesPath, "utf8");
const mapper = fs.readFileSync(mapperPath, "utf8");
const provider = fs.readFileSync(providerPath, "utf8");

const requiredActions = [
  "confirm",
  "cancel",
  "back",
  "openCommandPalette",
  "openSearch",
  "focusUp",
  "focusDown",
  "focusLeft",
  "focusRight",
  "pageUp",
  "pageDown",
  "previousTab",
  "nextTab",
  "reload",
  "save",
  "regenerate",
  "toggleFullscreen",
  "openControllerOverlay",
  "emergencyEscape",
];

const failures = [];
for (const action of requiredActions) {
  if (!types.includes(`| "${action}"`) && !types.includes(`  | "${action}"`)) {
    failures.push(`Missing action type declaration: ${action}`);
  }
}

const requiredMappedActions = [
  "confirm",
  "cancel",
  "reload",
  "openSearch",
  "previousTab",
  "nextTab",
  "pageUp",
  "pageDown",
];

for (const action of requiredMappedActions) {
  if (!mapper.includes(`"${action}"`)) {
    failures.push(`Missing default gamepad mapping for action: ${action}`);
  }
}

for (const action of ["save", "regenerate", "toggleFullscreen", "emergencyEscape"]) {
  if (!provider.includes(`case "${action}"`)) {
    failures.push(`Missing default router handler for action: ${action}`);
  }
}

if (failures.length > 0) {
  console.error("Controller action coverage check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Controller action coverage check passed.");
