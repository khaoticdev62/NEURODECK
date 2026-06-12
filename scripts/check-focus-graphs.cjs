const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const appPath = path.join(root, "frontend", "src", "react", "App.tsx");
const commandPalettePath = path.join(
  root,
  "frontend",
  "src",
  "react",
  "components",
  "command",
  "CommandPalette.tsx",
);
const onboardingPath = path.join(
  root,
  "frontend",
  "src",
  "react",
  "components",
  "onboarding",
  "OnboardingModal.tsx",
);

const app = fs.readFileSync(appPath, "utf8");
const commandPalette = fs.readFileSync(commandPalettePath, "utf8");
const onboarding = fs.readFileSync(onboardingPath, "utf8");

const failures = [];
if (!app.includes("data-controller-screen={id}")) {
  failures.push("App renderView wrapper is missing data-controller-screen registration.");
}
if (!app.includes("data-controller-default=\"true\"")) {
  failures.push("App main content is missing a controller default focus target.");
}
if (!commandPalette.includes("data-controller-overlay")) {
  failures.push("Command palette is missing controller overlay registration.");
}
if (!onboarding.includes("data-controller-overlay")) {
  failures.push("Onboarding modal is missing controller overlay registration.");
}

if (failures.length > 0) {
  console.error("Controller focus graph check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Controller focus graph check passed.");
