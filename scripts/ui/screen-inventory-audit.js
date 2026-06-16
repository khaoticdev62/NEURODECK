#!/usr/bin/env node
/**
 * NEURODECK Screen Inventory, Navigation & Alignment Audit
 *
 * Generates a canonical inventory of screens/views by scanning:
 *   - React view files under frontend/src/react/features/
 *   - Sidebar nav items (navItems) in frontend/src/react/types/seed.ts
 *   - Route-to-component mappings in frontend/src/react/App.tsx
 *   - data-controller-screen attributes in the shell
 *   - Registered controller actions
 *
 * Output: docs/audits/screens-navigation-alignment-1.8.x.md
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const REPORT_PATH = path.join(ROOT, 'docs/audits/screens-navigation-alignment-1.8.x.md');

const FEATURES_DIR = path.join(ROOT, 'frontend/src/react/features');
const SEED_PATH = path.join(ROOT, 'frontend/src/react/types/seed.ts');
const APP_PATH = path.join(ROOT, 'frontend/src/react/App.tsx');
const SHELL_PATH = path.join(ROOT, 'frontend/src/react/components/layout/NeurodeckShell.tsx');
const ACTION_REGISTRY_PATH = path.join(ROOT, 'frontend/src/react/utils/controller/action-registry.ts');

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[audit] ${msg}`);
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findViewFiles() {
  const entries = await fs.readdir(FEATURES_DIR, { withFileTypes: true });
  const views = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(FEATURES_DIR, entry.name);
    const files = await fs.readdir(dir);
    const viewFile = files.find((f) => f.endsWith('View.tsx') || f.endsWith('View.jsx'));
    if (viewFile) {
      const filePath = path.join(dir, viewFile);
      const content = await fs.readFile(filePath, 'utf8');
      const exportMatch = content.match(/export\s+(?:function|const)\s+(\w+)/);
      const componentName = exportMatch ? exportMatch[1] : viewFile.replace(/\.tsx?$/, '');
      const controllerScreenMatch = content.match(/data-controller-screen=["']([^"']+)["']/);
      views.push({
        id: entry.name,
        component: componentName,
        file: `frontend/src/react/features/${entry.name}/${viewFile}`,
        controllerScreen: controllerScreenMatch ? controllerScreenMatch[1] : null,
        lines: content.split('\n').length,
      });
    }
  }
  return views.sort((a, b) => a.id.localeCompare(b.id));
}

async function findNavItems() {
  if (!(await fileExists(SEED_PATH))) return [];
  const content = await fs.readFile(SEED_PATH, 'utf8');
  // Extract navItems array body
  const match = content.match(/export\s+const\s+navItems:\s*NavItem\[\]\s*=\s*\[([\s\S]*?)\];/);
  if (!match) return [];
  const block = match[1];
  const items = [];
  const regex = /\{\s*id:\s*["']([^"']+)["'],\s*label:\s*["']([^"']+)["'][\s\S]*?section:\s*["']([^"']+)["']/g;
  let m;
  while ((m = regex.exec(block)) !== null) {
    items.push({ id: m[1], label: m[2], section: m[3] });
  }
  return items;
}

async function findRouteMappings() {
  if (!(await fileExists(APP_PATH))) return [];
  const content = await fs.readFile(APP_PATH, 'utf8');
  const mappings = [];
  // Conditional render: state.activeView === "foo" && renderView("bar", <FooView />)
  // Also handles aliases: (state.activeView === "agent" || state.activeView === "agents")
  // and multiline renderView calls.
  const regex = /(?:\(\s*)?state\.activeView\s*===\s*["']([^"']+)["'](?:\s*\|\|\s*state\.activeView\s*===\s*["']([^"']+)["'])?(?:\s*\))?\s*&&[\s\S]{0,120}?renderView\(\s*["']([^"']+)["'],\s*<[\s\S]{0,60}?([A-Za-z0-9_]+View)/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const navId = m[1];
    const aliasId = m[2] || null;
    const routeId = m[3];
    const component = m[4];
    mappings.push({ navId, aliasId, routeId, component });
  }
  return mappings;
}

async function findShellScreens() {
  const screens = new Set();
  for (const p of [SHELL_PATH, APP_PATH]) {
    if (!(await fileExists(p))) continue;
    const content = await fs.readFile(p, 'utf8');
    // Literal string attributes (e.g. app-shell)
    const literalRegex = /data-controller-screen=\{?["']([^"']+)["']\}?/g;
    let m;
    while ((m = literalRegex.exec(content)) !== null) {
      screens.add(m[1]);
    }
    // Dynamic renderView route IDs become the active controller screen
    const renderRegex = /renderView\(\s*["']([^"']+)["']/g;
    while ((m = renderRegex.exec(content)) !== null) {
      screens.add(m[1]);
    }
  }
  return Array.from(screens).sort();
}

async function findControllerActions() {
  if (!(await fileExists(ACTION_REGISTRY_PATH))) return [];
  const content = await fs.readFile(ACTION_REGISTRY_PATH, 'utf8');
  const actions = [];
  // Match entries in defaultActions: { id: ActionId.FOO, title: "Bar", category: "baz" }
  const regex = /\{\s*id:\s*(?:ActionId\.)?([A-Za-z0-9_]+),\s*title:\s*["']([^"']+)["'],\s*category:\s*["']([^"']+)["']/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    actions.push({ id: m[1], title: m[2], category: m[3] });
  }
  return actions;
}

function findDuplicates(views) {
  const byScreen = {};
  for (const v of views) {
    if (!v.controllerScreen) continue;
    byScreen[v.controllerScreen] = byScreen[v.controllerScreen] || [];
    byScreen[v.controllerScreen].push(v);
  }
  return Object.entries(byScreen).filter(([, list]) => list.length > 1);
}

function findUnreachableByNav(navItems, routeMappings) {
  const routeNavIds = new Set(routeMappings.map((r) => r.navId).filter(Boolean));
  return navItems.filter((item) => !routeNavIds.has(item.id));
}

function findMissingNavItems(navItems, routeMappings) {
  const navIds = new Set(navItems.map((i) => i.id));
  return routeMappings.filter((r) => !navIds.has(r.navId));
}

function groupNavItemsBySection(navItems) {
  const grouped = {};
  for (const item of navItems) {
    grouped[item.section] = grouped[item.section] || [];
    grouped[item.section].push(item);
  }
  return grouped;
}

async function main() {
  log('Scanning React features...');
  const views = await findViewFiles();
  log(`Found ${views.length} view files`);

  log('Scanning sidebar navigation...');
  const navItems = await findNavItems();
  log(`Found ${navItems.length} nav items`);

  log('Scanning route mappings...');
  const routeMappings = await findRouteMappings();
  log(`Found ${routeMappings.length} route mappings`);

  log('Scanning shell screens...');
  const shellScreens = await findShellScreens();
  log(`Found ${shellScreens.length} shell screens`);

  log('Scanning controller actions...');
  const controllerActions = await findControllerActions();
  log(`Found ${controllerActions.length} controller actions`);

  const duplicates = findDuplicates(views);
  const unreachableByNav = findUnreachableByNav(navItems, routeMappings);
  const missingNavItems = findMissingNavItems(navItems, routeMappings);
  const navBySection = groupNavItemsBySection(navItems);

  const timestamp = new Date().toISOString();

  const viewRows = views
    .map(
      (v) =>
        `| ${v.id} | \`${v.component}\` | ${v.file} | ${v.controllerScreen || '—'} | ${v.lines} |`
    )
    .join('\n');

  const sectionRows = Object.entries(navBySection)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([section, items]) => {
      const header = `| **${section}** | | |`;
      const rows = items
        .map((item) => `| ${item.id} | ${item.label} | ${item.shortcut || ''} |`)
        .join('\n');
      return [header, rows];
    })
    .join('\n');

  const routeRows = routeMappings
    .map((r) =>
      r.aliasId
        ? `| ${r.navId} / ${r.aliasId} | \`${r.component}\` | ${r.routeId} |`
        : `| ${r.navId} | \`${r.component}\` | ${r.routeId} |`
    )
    .join('\n');

  const shellRows = shellScreens.length
    ? shellScreens.map((s) => `| \`${s}\` |`).join('\n')
    : '| — |';

  const actionRows = controllerActions.length
    ? controllerActions
        .map((a) => `| ${a.id} | ${a.title} | ${a.category} |`)
        .join('\n')
    : '| — | — | — |';

  const duplicateRows = duplicates.length
    ? duplicates
        .map(([screen, list]) => `| \`${screen}\` | ${list.map((v) => v.component).join(', ')} |`)
        .join('\n')
    : '| — | — |';

  const unreachableRows = unreachableByNav.length
    ? unreachableByNav.map((i) => `| ${i.id} | ${i.label} | ${i.section} |`).join('\n')
    : '| — | — | — |';

  const missingNavRows = missingNavItems.length
    ? missingNavItems
        .map((r) => `| ${r.navId} | \`${r.component}\` | ${r.routeId} |`)
        .join('\n')
    : '| — | — | — |';

  const report = `# NEURODECK Screen Inventory, Navigation & Alignment Audit

> Generated: ${timestamp}
> Command: \`node scripts/ui/screen-inventory-audit.js\`

## 1. View Inventory

| Feature ID | Component | File | Controller Screen | Lines |
|---|---|---|---|---|
${viewRows}

## 2. Sidebar Navigation (navItems)

| ID | Label | Shortcut |
|---|---|---|
${sectionRows}

## 3. Route → Component Mappings

\`renderView(routeId, <Component />)\` calls in \`App.tsx\`. Some nav IDs have aliases.

| Nav ID(s) | Component | Route ID |
|---|---|---|
${routeRows}

## 4. Shell-Mounted Controller Screens

Values assigned to \`data-controller-screen\`.

| Controller Screen |
|---|
${shellRows}

## 5. Controller Actions

Registered actions from \`action-registry.ts\`.

| Action ID | Title | Category |
|---|---|---|
${actionRows}

## 6. Duplicate Controller Screens

| Controller Screen | Duplicate Components |
|---|---|
${duplicateRows}

## 7. Nav Items Without Route Mappings

Sidebar items that do not appear in an \`App.tsx\` render condition.

| Nav ID | Label | Section |
|---|---|---|
${unreachableRows}

## 8. Route Mappings Without Sidebar Items

Routes rendered in \`App.tsx\` that are not in \`navItems\`.

| Nav ID | Component | Route ID |
|---|---|---|
${missingNavRows}

## 9. Alignment Audit Checklist

The following items require a rendered pass at 1280×800. Run \`npm run dev\`, navigate to each route, and inspect:

- [ ] Top nav bar height and left/right padding are consistent across all views.
- [ ] Side rail width and vertical position do not shift between views.
- [ ] Bottom status bar (if present) is anchored to the same bottom offset.
- [ ] View root uses \`overflow: hidden\` and has no horizontal scrollbar at 1280×800.
- [ ] Primary panel padding matches the 4px/8px grid (e.g., \`p-4\`, \`gap-4\`).
- [ ] No fixed-position chrome overlaps scrollable content.
- [ ] Modals/drawers are centered with identical overlay backgrounds.

## 10. Recommendations

1. If duplicate controller screens exist, consolidate into a single canonical view or rename.
2. If nav items lack route mappings, add the render branch or remove the dead nav item.
3. If route mappings lack nav items, decide if they should be exposed in the sidebar or are modal/overlay-only.
4. Use Chromatic/Playwright visual regression to lock chrome alignment after fixes.
`;

  await fs.writeFile(REPORT_PATH, report, 'utf8');
  log(`Report written to ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
