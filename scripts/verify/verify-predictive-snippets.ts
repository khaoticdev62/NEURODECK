/**
 * verify-predictive-snippets.ts
 * Validates every snippet in language profile JSONs:
 *   - has id, label, insertText
 *   - placeholders is an array
 *   - controllerFriendly is boolean
 *   - insertText produces non-empty text
 *   - no obvious invalid syntax (no bare ${undefined})
 */
import * as fs from 'fs';
import * as path from 'path';

const PROFILES_DIR = path.resolve(__dirname, '../../assets/language-profiles');
const REQUIRED_LANGUAGES = ['typescript', 'python', 'rust', 'go', 'lua', 'bash'];
const MIN_SNIPPETS_PER_LANGUAGE = 4;

let failures = 0;
let checks = 0;

function pass(msg: string) { console.log(`[PASS] ${msg}`); checks++; }
function fail(msg: string) { console.error(`[FAIL] ${msg}`); failures++; checks++; }
function info(msg: string) { console.log(`[INFO] ${msg}`); }

function verifySnippet(snippet: any, profileId: string) {
  const ctx = `${profileId}::snippet::${snippet.id ?? '?'}`;

  if (typeof snippet.id !== 'string' || !snippet.id.trim()) {
    fail(`${ctx}: id must be a non-empty string`);
  } else {
    pass(`${ctx}: id present`);
  }

  if (typeof snippet.label !== 'string' || !snippet.label.trim()) {
    fail(`${ctx}: label must be a non-empty string`);
  } else {
    pass(`${ctx}: label = "${snippet.label}"`);
  }

  if (typeof snippet.insertText !== 'string' || !snippet.insertText.trim()) {
    fail(`${ctx}: insertText must be non-empty`);
  } else {
    pass(`${ctx}: insertText present (${snippet.insertText.length} chars)`);

    // Basic syntax sanity — no bare ${undefined}
    if (snippet.insertText.includes('${undefined}')) {
      fail(`${ctx}: insertText contains \${undefined} — invalid placeholder`);
    }
    // Must not be just whitespace
    if (!snippet.insertText.replace(/\s/g, '')) {
      fail(`${ctx}: insertText is all whitespace`);
    }
  }

  if (!Array.isArray(snippet.placeholders)) {
    fail(`${ctx}: placeholders must be an array`);
  } else {
    pass(`${ctx}: placeholders is array (${snippet.placeholders.length} items)`);
    for (const ph of snippet.placeholders) {
      // Accept either { id, placeholder } or { index, label, defaultValue } format
      const hasId = typeof ph.id === 'string' || typeof ph.index === 'number';
      const hasLabel = typeof ph.placeholder === 'string' || typeof ph.label === 'string';
      if (!hasId || !hasLabel) {
        fail(`${ctx}: placeholder must have id/index and placeholder/label fields`);
      }
    }
  }

  if (typeof snippet.controllerFriendly !== 'boolean') {
    fail(`${ctx}: controllerFriendly must be boolean`);
  } else {
    pass(`${ctx}: controllerFriendly = ${snippet.controllerFriendly}`);
  }
}

function getProfileIds(filePath: string): { id: string; snippets: any[] }[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let profiles: any[];
  if (Array.isArray(raw)) {
    profiles = raw;
  } else if (raw.profiles && Array.isArray(raw.profiles)) {
    profiles = raw.profiles;
  } else {
    profiles = [raw];
  }
  return profiles.map((p) => ({ id: p.id ?? path.basename(filePath, '.json'), snippets: p.snippets ?? [] }));
}

function main() {
  const files = fs.readdirSync(PROFILES_DIR).filter((f) => f.endsWith('.json'));
  info(`Found ${files.length} profile file(s)`);

  const coveredLanguages = new Set<string>();

  for (const file of files) {
    const entries = getProfileIds(path.join(PROFILES_DIR, file));
    for (const { id, snippets } of entries) {
      info(`--- Profile: ${id} (${snippets.length} snippets) ---`);
      coveredLanguages.add(id);

      if (snippets.length < MIN_SNIPPETS_PER_LANGUAGE) {
        fail(`${id}: has only ${snippets.length} snippet(s), minimum is ${MIN_SNIPPETS_PER_LANGUAGE}`);
      } else {
        pass(`${id}: snippet count meets minimum (${snippets.length})`);
      }

      for (const snippet of snippets) {
        verifySnippet(snippet, id);
      }
    }
  }

  info('--- Required language coverage ---');
  for (const lang of REQUIRED_LANGUAGES) {
    if (coveredLanguages.has(lang)) {
      pass(`Language covered: ${lang}`);
    } else {
      fail(`Language not covered: ${lang}`);
    }
  }

  console.log(`\n=== verify-predictive-snippets: ${checks - failures}/${checks} passed ===`);
  if (failures > 0) {
    console.error(`${failures} failure(s) found.`);
    process.exit(1);
  }
}

main();
