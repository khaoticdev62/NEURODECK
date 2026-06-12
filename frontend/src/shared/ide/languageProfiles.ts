/**
 * Language profile registry — loads and validates language profiles from
 * the assets/language-profiles/ JSON files.
 * Follows the same pattern as modelSupportRegistry.ts.
 */
import type { LanguageProfile } from '../contracts/ide.contracts';
import { isLanguageProfile } from './ideSchemas';

import typescriptRaw from '../../../../assets/language-profiles/typescript.json';
import pythonRaw from '../../../../assets/language-profiles/python.json';
import rustRaw from '../../../../assets/language-profiles/rust.json';
import goRaw from '../../../../assets/language-profiles/go.json';
import luaRaw from '../../../../assets/language-profiles/lua.json';
import bashRaw from '../../../../assets/language-profiles/bash.json';
import htmlCssRaw from '../../../../assets/language-profiles/html-css.json';
import configRaw from '../../../../assets/language-profiles/config.json';

export type LanguageProfileRegistry = {
  version: string;
  updatedAt: string;
  profiles: LanguageProfile[];
};

function collectProfiles(raw: { profiles?: unknown[] }): LanguageProfile[] {
  if (!Array.isArray(raw.profiles)) return [];
  const valid: LanguageProfile[] = [];
  const invalid: unknown[] = [];
  for (const p of raw.profiles) {
    if (isLanguageProfile(p)) valid.push(p);
    else invalid.push(p);
  }
  if (invalid.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[languageProfiles] Dropped ${invalid.length} invalid profile(s)`);
  }
  return valid;
}

export function createLanguageProfileRegistry(): LanguageProfileRegistry {
  const sources = [
    typescriptRaw,
    pythonRaw,
    rustRaw,
    goRaw,
    luaRaw,
    bashRaw,
    htmlCssRaw,
    configRaw,
  ];

  const profiles: LanguageProfile[] = [];
  for (const src of sources) {
    profiles.push(...collectProfiles(src as { profiles?: unknown[] }));
  }

  return {
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    profiles,
  };
}

let _registry: LanguageProfileRegistry | null = null;

function getRegistry(): LanguageProfileRegistry {
  if (!_registry) _registry = createLanguageProfileRegistry();
  return _registry;
}

export function getAllProfiles(): LanguageProfile[] {
  return getRegistry().profiles;
}

export function getLanguageProfileById(id: string): LanguageProfile | undefined {
  return getRegistry().profiles.find((p) => p.id === id);
}

export function getProfileForFile(filename: string): LanguageProfile | undefined {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot === -1) return undefined;
  const ext = lower.slice(dot);
  return getRegistry().profiles.find((p) => p.fileExtensions.includes(ext));
}

export function getProfilesForExtension(ext: string): LanguageProfile[] {
  const normalized = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return getRegistry().profiles.filter((p) =>
    p.fileExtensions.includes(normalized)
  );
}
