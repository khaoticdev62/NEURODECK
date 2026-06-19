import * as fs from 'fs';
import * as path from 'path';

// Reuse the frontend's shared validators so the script enforces the same contract.
// tsx can load TypeScript directly, so we import the source even though it lives under frontend/.
import {
  isSupportedModelProfile,
  isProviderRuntimeProfile,
  isAgentModelPolicy,
  scoreSteamDeckCompatibility,
} from '../../src/renderer/shared/index';
import type {
  SupportedModelProfile,
  ProviderRuntimeProfile,
  AgentModelPolicy,
} from '../../src/renderer/shared/index';

const ASSETS_DIR = path.resolve(__dirname, '../../assets/model-registry');
let failure = false;

function fail(message: string) {
  console.error(`[FAIL] ${message}`);
  failure = true;
}

function pass(message: string) {
  console.log(`[PASS] ${message}`);
}

function loadJson<T>(name: string): T | null {
  const filePath = path.join(ASSETS_DIR, name);
  if (!fs.existsSync(filePath)) {
    fail(`${name} not found at ${filePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch (e) {
    fail(`${name} is not valid JSON: ${(e as Error).message}`);
    return null;
  }
}

function validateSupportedModels() {
  const data = loadJson<{ models: unknown[] }>('supported-models.json');
  if (!data) return;
  if (!Array.isArray(data.models)) {
    fail('supported-models.json must contain a "models" array');
    return;
  }
  const valid: SupportedModelProfile[] = [];
  let invalidCount = 0;
  for (const entry of data.models) {
    if (isSupportedModelProfile(entry)) valid.push(entry);
    else invalidCount++;
  }
  if (invalidCount > 0) {
    fail(`${invalidCount} supported model profile(s) failed schema validation`);
  } else {
    pass(`All ${valid.length} supported model profiles are valid`);
  }

  // Each profile must be scorable without crashing.
  for (const profile of valid) {
    const score = scoreSteamDeckCompatibility(profile, { installed: false });
    if (score.modelId !== profile.id) {
      fail(`Score modelId mismatch for ${profile.id}`);
    }
  }
  if (valid.length > 0) pass('All model profiles are scorable');
}

function validateProviderRuntimes() {
  const data = loadJson<{ runtimes: unknown[] }>('provider-runtimes.json');
  if (!data) return;
  if (!Array.isArray(data.runtimes)) {
    fail('provider-runtimes.json must contain a "runtimes" array');
    return;
  }
  const valid: ProviderRuntimeProfile[] = [];
  let invalidCount = 0;
  for (const entry of data.runtimes) {
    if (isProviderRuntimeProfile(entry)) valid.push(entry);
    else invalidCount++;
  }
  if (invalidCount > 0) {
    fail(`${invalidCount} provider runtime profile(s) failed schema validation`);
  } else {
    pass(`All ${valid.length} provider runtime profiles are valid`);
  }

  const ids = new Set<string>();
  for (const runtime of valid) {
    if (ids.has(runtime.id)) {
      fail(`Duplicate provider runtime id: ${runtime.id}`);
    }
    ids.add(runtime.id);
  }
  if (ids.size === valid.length) pass('Provider runtime ids are unique');
}

function validateAgentPolicies() {
  const data = loadJson<{ policies: unknown[] }>('agent-policies.json');
  if (!data) return;
  if (!Array.isArray(data.policies)) {
    fail('agent-policies.json must contain a "policies" array');
    return;
  }
  const valid: AgentModelPolicy[] = [];
  let invalidCount = 0;
  for (const entry of data.policies) {
    if (isAgentModelPolicy(entry)) valid.push(entry);
    else invalidCount++;
  }
  if (invalidCount > 0) {
    fail(`${invalidCount} agent policy(ies) failed schema validation`);
  } else {
    pass(`All ${valid.length} agent policies are valid`);
  }

  const ids = new Set<string>();
  for (const policy of valid) {
    if (ids.has(policy.agentId)) {
      fail(`Duplicate agent policy id: ${policy.agentId}`);
    }
    ids.add(policy.agentId);
  }
  if (ids.size === valid.length) pass('Agent policy ids are unique');
}

function main() {
  console.log('--- VERIFYING MODEL SUPPORT REGISTRY ---');
  validateSupportedModels();
  validateProviderRuntimes();
  validateAgentPolicies();
  if (failure) {
    console.error('\nModel support registry validation FAILED');
    process.exit(1);
  }
  console.log('\nModel support registry validation PASSED');
}

main();
