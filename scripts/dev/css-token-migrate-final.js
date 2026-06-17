#!/usr/bin/env node
/**
 * CSS Token Migration — Final Pass
 * Replaces remaining legacy shim tokens and hardcoded values in app.css
 * and a handful of TS/TSX consumers with canonical --nd-* tokens.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function write(rel, content) {
  fs.writeFileSync(path.join(ROOT, rel), content, "utf8");
}

function applyReplacements(content, replacements) {
  // Sort by descending length so longer matches win.
  const sorted = [...replacements].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sorted) {
    content = content.split(from).join(to);
  }
  return content;
}

const appReplacements = [
  // Root/top-level color tokens
  [
    "linear-gradient(135deg, var(--nd-accent-primary) 0%, #3b82f6 45%, #8b5cf6 100%)",
    "var(--nd-gradient-brand)",
  ],
  [
    "linear-gradient(180deg, rgba(16, 24, 32, 0.92), rgba(5, 7, 10, 0.96))",
    "var(--nd-gradient-brand-dark)",
  ],
  ["0 0 24px rgba(94, 235, 255, 0.22)", "var(--nd-glow-brand-sm)"],
  ["0 0 40px rgba(94, 235, 255, 0.38)", "var(--nd-glow-brand-lg)"],
  ["rgba(255, 255, 255, 0.007)", "var(--nd-grid-line)"],
  ["rgba(8, 12, 16, 0.95)", "var(--nd-surface-sidebar-backdrop)"],
  [
    "linear-gradient(to bottom, rgba(10, 14, 20, 0.98), rgba(6, 9, 12, 0.97))",
    "var(--nd-gradient-header)",
  ],

  // Legacy RGB variable aliases
  ["var(--accent-rgb)", "var(--nd-cyan-rgb)"],
  ["var(--response-rgb)", "var(--nd-green-rgb)"],
  ["var(--error-rgb)", "var(--nd-red-rgb)"],
  ["var(--warning-rgb)", "var(--nd-yellow-rgb)"],

  // Legacy shim token usages -> canonical tokens
  ["var(--bg-color)", "var(--nd-surface-primary)"],
  ["var(--fg-color)", "var(--nd-text-primary)"],
  ["var(--accent-color)", "var(--nd-accent-primary)"],
  ["var(--response-color)", "var(--nd-accent-success)"],
  ["var(--warning-color)", "var(--nd-accent-warning)"],
  ["var(--error-color)", "var(--nd-accent-error)"],
  ["var(--muted-color)", "var(--nd-surface-legacy-muted)"],
  ["var(--panel-bg)", "var(--nd-surface-secondary)"],
  ["var(--border-color)", "var(--nd-accent-a15)"],
  ["var(--shadow-color)", "var(--nd-black-50)"],
  ["var(--font-sans)", "var(--nd-font-ui)"],
  ["var(--font-mono)", "var(--nd-font-mono)"],
  ["var(--font-display)", "var(--nd-font-display)"],
  ["var(--font-body)", "var(--nd-font-ui)"],
  ["var(--space-1)", "var(--nd-space-1)"],
  ["var(--space-2)", "var(--nd-space-2)"],
  ["var(--space-3)", "var(--nd-space-3)"],
  ["var(--dur-fast)", "var(--nd-motion-fast-secondary)"],
  ["var(--dur-micro)", "var(--nd-motion-micro)"],
  ["var(--dur-base)", "var(--nd-motion-slow)"],
  ["var(--dur-enter)", "var(--nd-motion-enter)"],
  ["var(--dur-spring)", "var(--nd-motion-spring)"],
  ["var(--dur-ambient)", "var(--nd-motion-ambient)"],
  ["var(--ease-standard)", "var(--nd-ease-standard)"],
  ["var(--ease-snap)", "var(--nd-ease-snap)"],
  ["var(--shadow-1)", "var(--nd-elevation-shadow-1)"],
  ["var(--shadow-2)", "var(--nd-elevation-shadow-2)"],
  ["var(--shadow-3)", "var(--nd-elevation-shadow-3)"],
  ["var(--shadow-4)", "var(--nd-elevation-shadow-4)"],
  ["var(--shadow-glow-2)", "var(--nd-elevation-glow-2)"],
  ["var(--bg-dark)", "var(--nd-void-975)"],
  ["var(--bg-surface)", "var(--nd-surface-ide)"],
  ["var(--fg-muted)", "var(--nd-white-45)"],
  ["var(--color-success)", "var(--nd-state-success)"],
  ["var(--color-info)", "var(--nd-state-info)"],
  ["var(--color-warning)", "var(--nd-state-warning)"],
  ["var(--color-danger)", "var(--nd-state-error)"],
  ["var(--color-success-rgb)", "var(--nd-green-legacy-rgb)"],
  ["var(--color-info-rgb)", "var(--nd-blue-legacy-rgb)"],
  ["var(--color-warning-rgb)", "var(--nd-yellow-legacy-rgb)"],
  ["var(--color-danger-rgb)", "var(--nd-red-legacy-rgb)"],

  // Border-radius literals
  ["border-radius: 50%;", "border-radius: var(--nd-radius-circle);"],
  ["border-radius: 50% !important;", "border-radius: var(--nd-radius-circle) !important;"],
  ["border-radius: 5px;", "border-radius: var(--nd-radius-5px);"],
  ["border-radius: 5px !important;", "border-radius: var(--nd-radius-5px) !important;"],
  ["border-radius: 5px 5px 0 0;", "border-radius: var(--nd-radius-5px) var(--nd-radius-5px) 0 0;"],
  ["border-radius: 3px;", "border-radius: var(--nd-radius-3px);"],
  ["border-radius: 3px !important;", "border-radius: var(--nd-radius-3px) !important;"],
  ["border-radius: 0 3px 3px 0;", "border-radius: 0 var(--nd-radius-3px) var(--nd-radius-3px) 0;"],
  ["border-radius: 2px;", "border-radius: var(--nd-radius-2xs);"],
  ["border-radius: 2px 2px 0 0;", "border-radius: var(--nd-radius-2xs) var(--nd-radius-2xs) 0 0;"],
  ["border-radius: 7px;", "border-radius: var(--nd-radius-7px);"],
  ["border-radius: 7px !important;", "border-radius: var(--nd-radius-7px) !important;"],
  ["border-radius: 14px;", "border-radius: var(--nd-radius-lg);"],
  ["border-radius: 14px 14px 0 0;", "border-radius: var(--nd-radius-lg) var(--nd-radius-lg) 0 0;"],
  ["border-radius: 16px;", "border-radius: var(--nd-radius-xl);"],
  ["border-radius: 16px 16px 0 0;", "border-radius: var(--nd-radius-xl) var(--nd-radius-xl) 0 0;"],
  ["border-radius: 18px;", "border-radius: var(--nd-radius-2xl);"],
  ["border-radius: 18px 0 0 18px;", "border-radius: var(--nd-radius-2xl) 0 0 var(--nd-radius-2xl);"],
  ["border-radius: 0 18px 18px 0;", "border-radius: 0 var(--nd-radius-2xl) var(--nd-radius-2xl) 0;"],
  ["border-radius: 0 0 18px 18px;", "border-radius: 0 0 var(--nd-radius-2xl) var(--nd-radius-2xl);"],
  ["border-radius: 20px;", "border-radius: var(--nd-radius-3xl);"],
  ["border-radius: 22px;", "border-radius: var(--nd-radius-22px);"],
  ["border-radius: 1px;", "border-radius: var(--nd-radius-hairline);"],
  ["border-radius: 9px;", "border-radius: var(--nd-radius-9px);"],
  ["border-radius: 9px !important;", "border-radius: var(--nd-radius-9px) !important;"],
  ["border-radius: 0;", "border-radius: var(--nd-radius-none);"],
  ["border-radius: 0 0 0 8px;", "border-radius: 0 0 0 var(--nd-radius-8px);"],
  ["border-radius: 0 8px 8px 0 !important;", "border-radius: 0 var(--nd-radius-8px) var(--nd-radius-8px) 0 !important;"],

  // Global color substitutions (black alphas)
  ["rgba(0, 0, 0, 0.05)", "var(--nd-black-5)"],
  ["rgba(0, 0, 0, 0.06)", "var(--nd-black-6)"],
  ["rgba(0, 0, 0, 0.08)", "var(--nd-black-8)"],
  ["rgba(0, 0, 0, 0.1)", "var(--nd-black-10)"],
  ["rgba(0, 0, 0, 0.12)", "var(--nd-black-12)"],
  ["rgba(0, 0, 0, 0.14)", "var(--nd-black-15)"],
  ["rgba(0, 0, 0, 0.15)", "var(--nd-black-15)"],
  ["rgba(0, 0, 0, 0.16)", "var(--nd-black-15)"],
  ["rgba(0, 0, 0, 0.18)", "var(--nd-black-20)"],
  ["rgba(0, 0, 0, 0.2)", "var(--nd-black-20)"],
  ["rgba(0, 0, 0, 0.22)", "var(--nd-black-20)"],
  ["rgba(0, 0, 0, 0.24)", "var(--nd-black-25)"],
  ["rgba(0, 0, 0, 0.25)", "var(--nd-black-25)"],
  ["rgba(0, 0, 0, 0.28)", "var(--nd-black-30)"],
  ["rgba(0, 0, 0, 0.3)", "var(--nd-black-30)"],
  ["rgba(0, 0, 0, 0.32)", "var(--nd-black-30)"],
  ["rgba(0, 0, 0, 0.34)", "var(--nd-black-40)"],
  ["rgba(0, 0, 0, 0.4)", "var(--nd-black-40)"],
  ["rgba(0, 0, 0, 0.45)", "var(--nd-black-40)"],
  ["rgba(0, 0, 0, 0.5)", "var(--nd-black-50)"],
  ["rgba(0, 0, 0, 0.55)", "var(--nd-black-55)"],
  ["rgba(0, 0, 0, 0.6)", "var(--nd-black-60)"],
  ["rgba(0, 0, 0, 0.7)", "var(--nd-black-70)"],
  ["rgba(0, 0, 0, 0.8)", "var(--nd-black-80)"],

  // Global color substitutions (white alphas)
  ["rgba(255, 255, 255, 0.04)", "var(--nd-white-4)"],
  ["rgba(255, 255, 255, 0.05)", "var(--nd-white-5)"],
  ["rgba(255, 255, 255, 0.06)", "var(--nd-white-6)"],
  ["rgba(255, 255, 255, 0.07)", "var(--nd-white-7)"],
  ["rgba(255, 255, 255, 0.08)", "var(--nd-white-8)"],
  ["rgba(255, 255, 255, 0.1)", "var(--nd-white-10)"],
  ["rgba(255, 255, 255, 0.15)", "var(--nd-white-15)"],
  ["rgba(255, 255, 255, 0.22)", "var(--nd-white-25)"],
  ["rgba(255, 255, 255, 0.38)", "var(--nd-white-45)"],
  ["rgba(255, 255, 255, 0.45)", "var(--nd-white-45)"],
  ["rgba(255, 255, 255, 0.65)", "var(--nd-white-65)"],

  // RGB-channel primitives for accent/status colors
  ["rgba(94, 235, 255, ", "rgba(var(--nd-cyan-rgb), "],
  ["rgba(96, 233, 255, ", "rgba(var(--nd-cyan-rgb), "],
  ["rgba(98, 233, 209, ", "rgba(var(--nd-cyan-rgb), "],
  ["rgba(124, 255, 178, ", "rgba(var(--nd-green-rgb), "],
  ["rgba(143, 255, 177, ", "rgba(var(--nd-green-rgb), "],
  ["rgba(0, 255, 136, ", "rgba(var(--nd-green-rgb), "],
  ["rgba(255, 90, 106, ", "rgba(var(--nd-red-rgb), "],
  ["rgba(239, 71, 111, ", "rgba(var(--nd-red-rgb), "],
  ["rgba(255, 60, 90, ", "rgba(var(--nd-red-rgb), "],
  ["rgba(255, 136, 171, ", "rgba(var(--nd-red-rgb), "],
  ["rgba(255, 145, 221, ", "rgba(var(--nd-red-rgb), "],
  ["rgba(255, 200, 87, ", "rgba(var(--nd-yellow-rgb), "],
  ["rgba(255, 199, 112, ", "rgba(var(--nd-yellow-rgb), "],
  ["rgba(255, 176, 0, ", "rgba(var(--nd-yellow-rgb), "],
  ["rgba(255, 149, 0, ", "rgba(var(--nd-yellow-rgb), "],
  ["rgba(255, 157, 116, ", "rgba(var(--nd-yellow-rgb), "],
  ["rgba(255, 175, 125, ", "rgba(var(--nd-yellow-rgb), "],
  ["rgba(79, 140, 255, ", "rgba(var(--nd-blue-rgb), "],
  ["rgba(126, 188, 255, ", "rgba(var(--nd-blue-rgb), "],
  ["rgba(178, 140, 255, ", "rgba(var(--nd-purple-rgb), "],
  ["rgba(191, 174, 255, ", "rgba(var(--nd-purple-rgb), "],
  ["rgba(124, 58, 237, ", "rgba(var(--nd-purple-rgb), "],
  ["rgba(239, 68, 68, ", "rgba(var(--nd-red-legacy-rgb), "],
  ["rgba(168, 85, 247, ", "rgba(var(--nd-purple-legacy-rgb), "],
  // legacy var-based rgb channels still appearing inside rgba()
  ["rgba(var(--accent-rgb), ", "rgba(var(--nd-cyan-rgb), "],
  ["rgba(var(--response-rgb), ", "rgba(var(--nd-green-rgb), "],
  ["rgba(var(--error-rgb), ", "rgba(var(--nd-red-rgb), "],
  ["rgba(var(--warning-rgb), ", "rgba(var(--nd-yellow-rgb), "],

  // Common hex substitutions
  ["#00f0ff", "var(--nd-accent-bright)"],
  ["#5eebff", "var(--nd-accent-primary)"],
  ["#3b82f6", "var(--nd-blue-legacy)"],
  ["#8b5cf6", "var(--nd-purple-400)"],
  ["#22c55e", "var(--nd-green-legacy)"],
  ["#ef4444", "var(--nd-red-legacy)"],
  ["#f59e0b", "var(--nd-yellow-legacy)"],
  ["#ff3c5a", "var(--nd-red-400)"],
  ["#f87171", "var(--nd-red-300)"],
  ["#00ff88", "var(--nd-green-400)"],
  ["#e09b3d", "var(--nd-yellow-legacy)"],
];

const fileReplacements = {
  "frontend/src/app.css": appReplacements,
  "frontend/src/react/index.css": [
    ["var(--font-body)", "var(--nd-font-ui)"],
  ],
  "frontend/src/react/App.tsx": [
    ['"--font-body"', '"--nd-font-ui"'],
  ],
  "frontend/src/react/theme/cssVariableInjector.ts": [
    ['"--font-body"', '"--nd-font-ui"'],
    ['"--font-mono"', '"--nd-font-mono"'],
    ['"--font-display"', '"--nd-font-display"'],
  ],
  "frontend/src/react/features/settings/wallpaperManager.ts": [
    ['"var(--accent-color)"', '"var(--nd-accent-primary)"'],
    ['"var(--response-color)"', '"var(--nd-accent-success)"'],
    ['getPropertyValue("--accent-color")', 'getPropertyValue("--nd-accent-primary")'],
    ['getPropertyValue("--response-color")', 'getPropertyValue("--nd-accent-success")'],
  ],
};

for (const [rel, replacements] of Object.entries(fileReplacements)) {
  const original = read(rel);
  const updated = applyReplacements(original, replacements);
  write(rel, updated);
  console.log(`[migrate] ${rel}`);
}

console.log("[migrate] done");
