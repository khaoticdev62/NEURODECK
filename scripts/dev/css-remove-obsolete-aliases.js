#!/usr/bin/env node
/**
 * Remove obsolete legacy alias definitions from app.css :root block.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const file = path.join(ROOT, "frontend/src/app.css");
let lines = fs.readFileSync(file, "utf8").split("\n");

const obsolete = new Set([
  "--bg-color",
  "--fg-color",
  "--accent-color",
  "--response-color",
  "--warning-color",
  "--error-color",
  "--accent-rgb",
  "--response-rgb",
  "--error-rgb",
  "--warning-rgb",
  "--muted-color",
  "--panel-bg",
  "--border-color",
  "--shadow-color",
  "--font-sans",
  "--font-mono",
  "--font-display",
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-5",
  "--space-6",
  "--space-7",
  "--space-8",
  "--space-9",
  "--space-10",
  "--space-11",
  "--space-12",
  "--dur-fast",
  "--dur-micro",
  "--dur-base",
  "--dur-enter",
  "--dur-spring",
  "--dur-ambient",
  "--ease-snap",
  "--ease-out-expo",
  "--ease-out-spring",
  "--ease-standard",
  "--ease-in-out-smooth",
  "--shadow-0",
  "--shadow-1",
  "--shadow-2",
  "--shadow-3",
  "--shadow-4",
  "--shadow-glow-1",
  "--shadow-glow-2",
  "--shadow-glow-3",
  "--bg-dark",
  "--bg-surface",
  "--fg-muted",
  "--color-success",
  "--color-success-rgb",
  "--color-info",
  "--color-info-rgb",
  "--color-warning",
  "--color-warning-rgb",
  "--color-danger",
  "--color-danger-rgb",
  "--surface-l0",
  "--surface-l1",
  "--surface-l2",
  "--surface-l3",
  "--brand-gradient",
  "--brand-gradient-dark",
  "--brand-glow",
  "--brand-glow-strong",
]);

lines = lines.filter((line) => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("--")) return true;
  const name = trimmed.split(":")[0].trim();
  return !obsolete.has(name);
});

fs.writeFileSync(file, lines.join("\n"), "utf8");
console.log("[cleanup] removed obsolete alias definitions from app.css");
