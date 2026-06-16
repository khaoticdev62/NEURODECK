/**
 * verify-language-commands.ts
 * Verifies every language profile JSON has real command templates:
 *   - command and args fields present
 *   - args is an array (never a shell string)
 *   - safety tier is one of safe|confirm|dangerous|blocked
 *   - cwdStrategy is valid
 *   - appliesWhen is an object
 */
import * as fs from 'fs';
import * as path from 'path';

const PROFILES_DIR = path.resolve(__dirname, '../assets/language-profiles');
const VALID_SAFETY = new Set(['safe', 'confirm', 'dangerous', 'blocked']);
const VALID_CWD = new Set(['workspaceRoot', 'fileDirectory', 'nearestPackageRoot', 'nearestGitRoot']);

let failures = 0;
let checks = 0;

function pass(msg: string) { console.log(`[PASS] ${msg}`); checks++; }
function fail(msg: string) { console.error(`[FAIL] ${msg}`); failures++; checks++; }
function info(msg: string) { console.log(`[INFO] ${msg}`); }

function verifyCommand(cmd: any, profileId: string) {
  const ctx = `${profileId}::${cmd.id ?? '?'}`;

  if (typeof cmd.command !== 'string' || !cmd.command.trim()) {
    fail(`${ctx}: command must be a non-empty string`);
  } else {
    pass(`${ctx}: command is a string`);
  }

  if (!Array.isArray(cmd.args)) {
    fail(`${ctx}: args must be an array (not a shell string)`);
  } else {
    pass(`${ctx}: args is an array`);
    for (const arg of cmd.args) {
      if (typeof arg !== 'string') {
        fail(`${ctx}: every arg must be a string, got ${typeof arg}`);
      }
    }
  }

  if (!VALID_SAFETY.has(cmd.safety)) {
    fail(`${ctx}: safety "${cmd.safety}" is not valid (expected: ${[...VALID_SAFETY].join('|')})`);
  } else {
    pass(`${ctx}: safety is ${cmd.safety}`);
  }

  if (!VALID_CWD.has(cmd.cwdStrategy)) {
    fail(`${ctx}: cwdStrategy "${cmd.cwdStrategy}" is not valid`);
  } else {
    pass(`${ctx}: cwdStrategy is ${cmd.cwdStrategy}`);
  }

  if (!cmd.appliesWhen || typeof cmd.appliesWhen !== 'object' || Array.isArray(cmd.appliesWhen)) {
    fail(`${ctx}: appliesWhen must be an object`);
  } else {
    pass(`${ctx}: appliesWhen is present`);
  }
}

function verifyProfile(filePath: string) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  // Support: bare profile, array of profiles, or wrapper { profiles: [...] }
  let profiles: any[];
  if (Array.isArray(raw)) {
    profiles = raw;
  } else if (raw.profiles && Array.isArray(raw.profiles)) {
    profiles = raw.profiles;
  } else {
    profiles = [raw];
  }

  for (const profile of profiles) {
    const pid = profile.id ?? path.basename(filePath, '.json');
    info(`--- Profile: ${pid} ---`);

    if (!Array.isArray(profile.fileExtensions) || profile.fileExtensions.length === 0) {
      fail(`${pid}: fileExtensions must be a non-empty array`);
    } else {
      pass(`${pid}: fileExtensions present (${profile.fileExtensions.length})`);
    }

    if (!profile.lsp || typeof profile.lsp.serverCommand !== 'string') {
      fail(`${pid}: lsp.serverCommand must be a string`);
    } else {
      pass(`${pid}: lsp.serverCommand = ${profile.lsp.serverCommand}`);
    }

    const commands: any[] = [];
    if (profile.commands) {
      for (const key of Object.keys(profile.commands)) {
        const val = profile.commands[key];
        if (Array.isArray(val)) {
          commands.push(...val);
        } else if (val && typeof val === 'object') {
          commands.push(val);
        }
      }
    }

    if (commands.length === 0) {
      fail(`${pid}: no commands found`);
    } else {
      pass(`${pid}: ${commands.length} command(s) found`);
      for (const cmd of commands) {
        verifyCommand(cmd, pid);
      }
    }

    if (!Array.isArray(profile.snippets) || profile.snippets.length < 4) {
      fail(`${pid}: must have at least 4 snippets, found ${profile.snippets?.length ?? 0}`);
    } else {
      pass(`${pid}: ${profile.snippets.length} snippets`);
    }

    if (!profile.safety || typeof profile.safety.allowRunByDefault !== 'boolean') {
      fail(`${pid}: safety.allowRunByDefault must be boolean`);
    } else {
      pass(`${pid}: safety.allowRunByDefault = ${profile.safety.allowRunByDefault}`);
    }
  }
}

function main() {
  const files = fs.readdirSync(PROFILES_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    fail('No language profile JSON files found in assets/language-profiles/');
    process.exit(1);
  }

  info(`Found ${files.length} profile file(s) in ${PROFILES_DIR}`);
  for (const file of files) {
    verifyProfile(path.join(PROFILES_DIR, file));
  }

  console.log(`\n=== verify-language-commands: ${checks - failures}/${checks} passed ===`);
  if (failures > 0) {
    console.error(`${failures} failure(s) found.`);
    process.exit(1);
  }
}

main();
