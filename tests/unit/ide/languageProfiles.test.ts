/**
 * Unit tests — language profile registry
 * Verifies that every profile is correctly loaded, indexed, and has
 * the minimum required fields.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// We import the registry functions directly. The JSON assets are loaded via
// Vite's JSON import in the browser; in the Node/vitest environment they are
// resolved as CommonJS JSON modules.
import {
  getAllProfiles,
  getLanguageProfileById,
  getProfileForFile,
  getProfilesForExtension,
  createLanguageProfileRegistry,
} from '../../../src/renderer/shared/ide/languageProfiles';

describe('createLanguageProfileRegistry', () => {
  it('returns an object with version, updatedAt, and profiles array', () => {
    const registry = createLanguageProfileRegistry();
    expect(registry).toHaveProperty('version');
    expect(registry).toHaveProperty('updatedAt');
    expect(Array.isArray(registry.profiles)).toBe(true);
  });

  it('loads at least 10 profiles across all language JSON files', () => {
    const registry = createLanguageProfileRegistry();
    expect(registry.profiles.length).toBeGreaterThanOrEqual(10);
  });
});

describe('getAllProfiles', () => {
  it('returns a non-empty array', () => {
    const profiles = getAllProfiles();
    expect(profiles.length).toBeGreaterThan(0);
  });

  it('every profile has required fields', () => {
    for (const p of getAllProfiles()) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.displayName).toBe('string');
      expect(Array.isArray(p.fileExtensions)).toBe(true);
      expect(p.fileExtensions.length).toBeGreaterThan(0);
      // commands is an object with category arrays (runFile, build, lint, etc.)
      expect(typeof p.commands).toBe('object');
      expect(p.commands).not.toBeNull();
      expect(Array.isArray(p.snippets)).toBe(true);
    }
  });

  it('every profile has at least one command across all categories', () => {
    for (const p of getAllProfiles()) {
      const allCmds = Object.values(p.commands).flat();
      expect(allCmds.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every profile has at least four snippets', () => {
    for (const p of getAllProfiles()) {
      expect(p.snippets.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('all fileExtensions start with a dot', () => {
    for (const p of getAllProfiles()) {
      for (const ext of p.fileExtensions) {
        expect(ext).toMatch(/^\./);
      }
    }
  });
});

describe('getLanguageProfileById', () => {
  it('returns the typescript profile by id', () => {
    const profile = getLanguageProfileById('typescript');
    expect(profile).toBeDefined();
    expect(profile?.displayName).toContain('TypeScript');
  });

  it('returns the python profile by id', () => {
    const profile = getLanguageProfileById('python');
    expect(profile).toBeDefined();
    expect(profile?.id).toBe('python');
  });

  it('returns the rust profile by id', () => {
    const profile = getLanguageProfileById('rust');
    expect(profile).toBeDefined();
  });

  it('returns the go profile by id', () => {
    const profile = getLanguageProfileById('go');
    expect(profile).toBeDefined();
  });

  it('returns the lua profile by id', () => {
    const profile = getLanguageProfileById('lua');
    expect(profile).toBeDefined();
  });

  it('returns the bash profile by id', () => {
    const profile = getLanguageProfileById('bash');
    expect(profile).toBeDefined();
  });

  it('returns undefined for unknown id', () => {
    expect(getLanguageProfileById('cobol')).toBeUndefined();
  });
});

describe('getProfileForFile', () => {
  it('matches .ts files to typescript', () => {
    const profile = getProfileForFile('component.ts');
    expect(profile?.id).toBe('typescript');
  });

  it('matches .tsx files to typescript or jsx', () => {
    const profile = getProfileForFile('App.tsx');
    expect(profile).toBeDefined();
  });

  it('matches .py files to python', () => {
    const profile = getProfileForFile('main.py');
    expect(profile?.id).toBe('python');
  });

  it('matches .rs files to rust', () => {
    const profile = getProfileForFile('lib.rs');
    expect(profile?.id).toBe('rust');
  });

  it('matches .go files to go', () => {
    const profile = getProfileForFile('main.go');
    expect(profile?.id).toBe('go');
  });

  it('matches .lua files to lua', () => {
    const profile = getProfileForFile('plugin.lua');
    expect(profile?.id).toBe('lua');
  });

  it('matches .sh files to bash', () => {
    const profile = getProfileForFile('install.sh');
    expect(profile?.id).toBe('bash');
  });

  it('matches .json files to json', () => {
    const profile = getProfileForFile('config.json');
    expect(profile?.id).toBe('json');
  });

  it('returns undefined for unknown extension', () => {
    expect(getProfileForFile('file.xyz123')).toBeUndefined();
  });
});

describe('getProfilesForExtension', () => {
  it('accepts extensions without leading dot', () => {
    const profiles = getProfilesForExtension('ts');
    expect(profiles.length).toBeGreaterThan(0);
  });

  it('accepts extensions with leading dot', () => {
    const profiles = getProfilesForExtension('.ts');
    expect(profiles.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown extension', () => {
    const profiles = getProfilesForExtension('xyz123');
    expect(profiles).toEqual([]);
  });
});
