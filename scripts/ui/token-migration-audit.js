#!/usr/bin/env node
/**
 * NEURODECK Token Migration Audit
 *
 * Scans legacy CSS (frontend/src/app.css) for hardcoded values that should
 * migrate to the canonical design token namespace.
 *
 * Output: docs/audits/token-migration-map-1.8.x.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const APP_CSS_PATH = path.join(ROOT, 'frontend/src/app.css');
const REPORT_PATH = path.join(ROOT, 'docs/audits/token-migration-map-1.8.x.json');

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[audit] ${msg}`);
}

function normalizeColor(value) {
  const lower = value.toLowerCase().trim();
  if (lower.startsWith('#') && lower.length === 4) {
    return `#${lower[1]}${lower[1]}${lower[2]}${lower[2]}${lower[3]}${lower[3]}`;
  }
  return lower;
}

function nearestSpaceToken(px) {
  const map = {
    0: '--nd-space-0',
    4: '--nd-space-1',
    8: '--nd-space-2',
    12: '--nd-space-3',
    16: '--nd-space-4',
    20: '--nd-space-5',
    24: '--nd-space-6',
    32: '--nd-space-8',
    40: '--nd-space-10',
    48: '--nd-space-12',
    64: '--nd-space-16',
  };
  if (map[px]) return map[px];
  const sorted = Object.keys(map).map(Number).sort((a, b) => a - b);
  const closest = sorted.reduce((prev, curr) =>
    Math.abs(curr - px) < Math.abs(prev - px) ? curr : prev
  );
  return `${map[closest]} /* ${px}px */`;
}

function nearestRadiusToken(px) {
  const map = { 0: '--nd-radius-none', 4: '--nd-radius-xs', 6: '--nd-radius-sm', 10: '--nd-radius-md', 14: '--nd-radius-lg', 20: '--nd-radius-xl', 999: '--nd-radius-full' };
  if (map[px]) return map[px];
  const sorted = Object.keys(map).map(Number).sort((a, b) => a - b);
  const closest = sorted.reduce((prev, curr) =>
    Math.abs(curr - px) < Math.abs(prev - px) ? curr : prev
  );
  return `${map[closest]} /* ${px}px */`;
}

function nearestDurationToken(ms) {
  const map = { 0: '--nd-motion-instant', 90: '--nd-motion-fast', 140: '--nd-motion-normal', 220: '--nd-motion-slow' };
  if (map[ms]) return map[ms];
  const sorted = Object.keys(map).map(Number).sort((a, b) => a - b);
  const closest = sorted.reduce((prev, curr) =>
    Math.abs(curr - ms) < Math.abs(prev - ms) ? curr : prev
  );
  return `${map[closest]} /* ${ms}ms */`;
}

async function main() {
  log('Reading app.css...');
  const content = await fs.readFile(APP_CSS_PATH, 'utf8');

  const colors = new Map(); // normalized -> { raw, count, contexts }
  const spaces = new Map(); // px -> count
  const fonts = new Map(); // px -> count
  const radii = new Map(); // px -> count
  const durations = new Map(); // ms -> count
  const zIndexes = new Map(); // number -> count
  const shadows = new Map(); // raw -> count

  const colorRegex = /(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\))/g;
  const pxRegex = /\b(\d+(?:\.\d+)?)px\b/g;
  const msRegex = /\b(\d+(?:\.\d+)?)ms\b/g;
  const zRegex = /z-index:\s*(-?\d+)/g;
  const shadowRegex = /box-shadow:\s*([^;]+);/g;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ctx = `L${i + 1}`;

    let m;
    while ((m = colorRegex.exec(line)) !== null) {
      const raw = m[1];
      const norm = normalizeColor(raw);
      const entry = colors.get(norm) || { raw, count: 0, contexts: [] };
      entry.count += 1;
      if (entry.contexts.length < 3) entry.contexts.push(ctx);
      colors.set(norm, entry);
    }

    while ((m = pxRegex.exec(line)) !== null) {
      const px = parseFloat(m[1]);
      if (line.includes('font-size') || line.includes('line-height') || /font:\s/.test(line)) {
        fonts.set(px, (fonts.get(px) || 0) + 1);
      } else if (line.includes('border-radius') || line.includes('border-top-left-radius') || line.includes('border-bottom-right-radius')) {
        radii.set(px, (radii.get(px) || 0) + 1);
      } else {
        spaces.set(px, (spaces.get(px) || 0) + 1);
      }
    }

    while ((m = msRegex.exec(line)) !== null) {
      const ms = parseFloat(m[1]);
      durations.set(ms, (durations.get(ms) || 0) + 1);
    }

    while ((m = zRegex.exec(line)) !== null) {
      const z = parseInt(m[1], 10);
      zIndexes.set(z, (zIndexes.get(z) || 0) + 1);
    }

    while ((m = shadowRegex.exec(line)) !== null) {
      const shadow = m[1].trim();
      shadows.set(shadow, (shadows.get(shadow) || 0) + 1);
    }
  }

  const map = {
    meta: {
      generated: new Date().toISOString(),
      source: 'frontend/src/app.css',
      lineCount: lines.length,
      note: 'Phase 0 scaffolding. Values are candidate mappings, not yet applied.',
    },
    colors: Array.from(colors.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 100)
      .map(([value, info]) => ({
        value,
        raw: info.raw,
        occurrences: info.count,
        proposedToken: null,
        contexts: info.contexts,
      })),
    spacing: Array.from(spaces.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([px, count]) => ({
        valuePx: px,
        occurrences: count,
        proposedToken: nearestSpaceToken(px),
      })),
    fontSizes: Array.from(fonts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([px, count]) => ({
        valuePx: px,
        occurrences: count,
        proposedToken: null, // typography tokens not yet finalized
      })),
    radii: Array.from(radii.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([px, count]) => ({
        valuePx: px,
        occurrences: count,
        proposedToken: nearestRadiusToken(px),
      })),
    durations: Array.from(durations.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([ms, count]) => ({
        valueMs: ms,
        occurrences: count,
        proposedToken: nearestDurationToken(ms),
      })),
    zIndexes: Array.from(zIndexes.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([z, count]) => ({
        value: z,
        occurrences: count,
        proposedToken: z >= 30000 ? '--z-toast-peak' : z >= 60 ? '--z-tooltip' : z >= 50 ? '--z-toast' : z >= 40 ? '--z-modal' : z >= 30 ? '--z-overlay' : z >= 20 ? '--z-dropdown' : z >= 10 ? '--z-sticky' : z >= 1 ? '--z-base' : z === -1 ? '--z-behind' : null,
      })),
    shadows: Array.from(shadows.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([value, count]) => ({
        value,
        occurrences: count,
        proposedToken: value.includes('0 24px 80px') ? '--nd-elevation-overlay' : value.includes('0 8px 24px') ? '--nd-elevation-card' : value.includes('0 1px 0 rgba(255,255,255') ? '--nd-elevation-panel' : null,
      })),
  };

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, JSON.stringify(map, null, 2), 'utf8');
  log(`Wrote ${REPORT_PATH}`);
  log(`Summary: ${colors.size} unique colors, ${spaces.size} spacing values, ${fonts.size} font sizes, ${radii.size} radii, ${durations.size} durations, ${zIndexes.size} z-index values, ${shadows.size} unique shadows`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
