/**
 * NEURODECK Design System v1.0 — build-time validation
 *
 * Runs before the production build to guarantee that:
 * - tokens.json is valid and contains the required v1.0 token categories
 * - the canonical unified token CSS exists
 * - the v1.0 theme modifier CSS files exist
 * - the app CSS entry imports the unified tokens + themes
 * - component-registry.json is valid and contains both implementations + specs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DS_ROOT = path.join(ROOT, 'src', 'renderer', 'design-system');

const requiredFiles = [
  { path: path.join(DS_ROOT, 'tokens.json'), label: 'Canonical tokens JSON' },
  { path: path.join(DS_ROOT, 'tokens', 'tokens.css'), label: 'Unified token CSS' },
  { path: path.join(DS_ROOT, 'themes', 'blacksite.css'), label: 'Blacksite theme' },
  { path: path.join(DS_ROOT, 'themes', 'tactical-glass.css'), label: 'Tactical Glass theme' },
  { path: path.join(DS_ROOT, 'themes', 'high-contrast.css'), label: 'High Contrast theme' },
  { path: path.join(DS_ROOT, 'themes', 'colorblind-safe.css'), label: 'Colorblind-Safe theme' },
  { path: path.join(DS_ROOT, 'component-registry.json'), label: 'Component registry' },
];

const requiredTokenCategories = [
  'color',
  'semantic',
  'spacing',
  'radius',
  'typography',
  'motion',
  'breakpoints',
];

const requiredImports = [
  "tokens/tokens.css",
  "themes/blacksite.css",
  "themes/tactical-glass.css",
  "themes/high-contrast.css",
  "themes/colorblind-safe.css",
];

let failed = false;

function fail(message) {
  console.error(`[design-system] ❌ ${message}`);
  failed = true;
}

function ok(message) {
  console.log(`[design-system] ✅ ${message}`);
}

// 1. Required files exist
for (const file of requiredFiles) {
  if (!fs.existsSync(file.path)) {
    fail(`Missing ${file.label}: ${path.relative(ROOT, file.path)}`);
  } else {
    ok(`${file.label} exists`);
  }
}

// 2. tokens.json is valid JSON and has required categories
const tokensPath = path.join(DS_ROOT, 'tokens.json');
if (fs.existsSync(tokensPath)) {
  try {
    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    for (const category of requiredTokenCategories) {
      if (!tokens[category]) {
        fail(`tokens.json missing required category: ${category}`);
      } else {
        ok(`tokens.json has category: ${category}`);
      }
    }
  } catch (err) {
    fail(`tokens.json is not valid JSON: ${err.message}`);
  }
}

// 3. component-registry.json is valid and contains implementations + v1.0 specs
const registryPath = path.join(DS_ROOT, 'component-registry.json');
if (fs.existsSync(registryPath)) {
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    if (!registry.components || Object.keys(registry.components).length === 0) {
      fail('component-registry.json missing components map');
    } else {
      ok('component-registry.json has components map');
    }
    if (!Array.isArray(registry.specifications) || registry.specifications.length === 0) {
      fail('component-registry.json missing v1.0 specifications array');
    } else {
      ok(`component-registry.json has ${registry.specifications.length} v1.0 specifications`);
    }
  } catch (err) {
    fail(`component-registry.json is not valid JSON: ${err.message}`);
  }
}

// 4. index.css imports the unified tokens + v1.0 themes
const indexCssPath = path.join(ROOT, 'src', 'renderer', 'index.css');
if (fs.existsSync(indexCssPath)) {
  const indexCss = fs.readFileSync(indexCssPath, 'utf8');
  for (const imp of requiredImports) {
    if (!indexCss.includes(imp)) {
      fail(`src/renderer/index.css missing import: ${imp}`);
    } else {
      ok(`index.css imports ${imp}`);
    }
  }
}

// 5. Unified tokens.css contains the v1.0 semantic namespace
const tokensCssPath = path.join(DS_ROOT, 'tokens', 'tokens.css');
if (fs.existsSync(tokensCssPath)) {
  const tokensCss = fs.readFileSync(tokensCssPath, 'utf8');
  const requiredVars = [
    '--nd-surface-primary',
    '--nd-surface-secondary',
    '--nd-accent-primary',
    '--nd-text-primary',
    '--nd-border-subtle',
    '--nd-focus-ring',
    '--nd-elevation-focus',
  ];
  for (const v of requiredVars) {
    if (!tokensCss.includes(v)) {
      fail(`tokens.css missing variable: ${v}`);
    } else {
      ok(`tokens.css defines ${v}`);
    }
  }
}

if (failed) {
  console.error('\n[design-system] Validation failed — production build aborted.');
  process.exit(1);
}

console.log('\n[design-system] All v1.0 token/theme/registry checks passed.');
