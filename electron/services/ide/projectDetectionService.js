'use strict';
/**
 * Project Detection Service
 * Scans a workspace root for config files and infers: detected languages,
 * package manager, available npm scripts, and whether git is initialised.
 *
 * Runs entirely in the Electron main process — never exposed to the renderer.
 */

const fs = require('fs');
const path = require('path');

/** Map from config file basename → language IDs it implies */
const CONFIG_TO_LANGUAGES = {
  'package.json': ['typescript', 'javascript'],
  'tsconfig.json': ['typescript'],
  'Cargo.toml': ['rust'],
  'go.mod': ['go'],
  'pyproject.toml': ['python'],
  'requirements.txt': ['python'],
  'Pipfile': ['python'],
  'setup.py': ['python'],
  'pytest.ini': ['python'],
  'CMakeLists.txt': ['c', 'cpp'],
  'Makefile': ['c', 'cpp'],
  'pom.xml': ['java'],
  'build.gradle': ['java'],
  'settings.gradle': ['java'],
  '.csproj': ['csharp'],
  '.sln': ['csharp'],
  '.luacheckrc': ['lua'],
  'stylua.toml': ['lua'],
  '.eslintrc.js': ['javascript', 'typescript'],
  '.eslintrc.json': ['javascript', 'typescript'],
  'eslint.config.js': ['javascript', 'typescript'],
  'vite.config.ts': ['typescript'],
  'vite.config.js': ['javascript'],
  'next.config.js': ['javascript', 'typescript'],
  'ruff.toml': ['python'],
};

const LOCKFILE_TO_PM = {
  'package-lock.json': 'npm',
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'bun.lockb': 'bun',
};

/**
 * Detect project context at the given workspace root path.
 * @param {string} workspacePath - Absolute path to workspace root
 * @returns {object} ProjectContext
 */
async function detectProject(workspacePath) {
  if (!workspacePath || typeof workspacePath !== 'string') {
    throw new Error('Invalid workspace path');
  }

  // Resolve to real path to prevent traversal tricks
  const resolved = path.resolve(workspacePath);

  let entries = [];
  try {
    entries = fs.readdirSync(resolved);
  } catch {
    return emptyContext(resolved);
  }

  const configFiles = [];
  const languageSet = new Set();
  let packageManager = 'none';
  let hasGit = false;
  let availableScripts = {};

  for (const entry of entries) {
    // Check for config file matches
    if (entry in CONFIG_TO_LANGUAGES) {
      configFiles.push(path.join(resolved, entry));
      for (const lang of CONFIG_TO_LANGUAGES[entry]) {
        languageSet.add(lang);
      }
    }

    // Check for lockfiles
    if (entry in LOCKFILE_TO_PM) {
      configFiles.push(path.join(resolved, entry));
      packageManager = LOCKFILE_TO_PM[entry];
    }

    // Check for .git
    if (entry === '.git') hasGit = true;

    // Also check extensions (e.g. *.csproj)
    if (entry.endsWith('.csproj') || entry.endsWith('.sln')) {
      configFiles.push(path.join(resolved, entry));
      languageSet.add('csharp');
    }
  }

  // Read package.json scripts if present
  const pkgPath = path.join(resolved, 'package.json');
  if (entries.includes('package.json')) {
    try {
      const raw = fs.readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(raw);
      if (pkg && typeof pkg.scripts === 'object' && pkg.scripts !== null) {
        availableScripts = pkg.scripts;
      }
    } catch {
      // Malformed package.json — ignore
    }
  }

  return {
    rootPath: resolved,
    detectedLanguages: [...languageSet],
    packageManager,
    hasGit,
    configFiles,
    availableScripts,
    detectedAt: new Date().toISOString(),
  };
}

function emptyContext(rootPath) {
  return {
    rootPath,
    detectedLanguages: [],
    packageManager: 'none',
    hasGit: false,
    configFiles: [],
    availableScripts: {},
    detectedAt: new Date().toISOString(),
  };
}

module.exports = { detectProject };
