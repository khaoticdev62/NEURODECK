import type {
  SupportedModelProfile,
  ProviderRuntimeProfile,
  AgentModelPolicy,
} from '../contracts/models.contracts';
import {
  isSupportedModelProfile,
  isProviderRuntimeProfile,
  isAgentModelPolicy,
} from '../schemas/models.schemas';

export type ModelRegistry = {
  version: string;
  updatedAt: string;
  models: SupportedModelProfile[];
};

export type RuntimeRegistry = {
  version: string;
  updatedAt: string;
  runtimes: ProviderRuntimeProfile[];
};

export type AgentPolicyRegistry = {
  version: string;
  updatedAt: string;
  policies: AgentModelPolicy[];
};

function validateModels(models: unknown[]): SupportedModelProfile[] {
  const valid: SupportedModelProfile[] = [];
  const invalid: unknown[] = [];
  for (const m of models) {
    if (isSupportedModelProfile(m)) valid.push(m);
    else invalid.push(m);
  }
  if (invalid.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[modelSupportRegistry] Dropping ${invalid.length} invalid model profile(s)`);
  }
  return valid;
}

function validateRuntimes(runtimes: unknown[]): ProviderRuntimeProfile[] {
  const valid: ProviderRuntimeProfile[] = [];
  const invalid: unknown[] = [];
  for (const r of runtimes) {
    if (isProviderRuntimeProfile(r)) valid.push(r);
    else invalid.push(r);
  }
  if (invalid.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[modelSupportRegistry] Dropping ${invalid.length} invalid runtime profile(s)`);
  }
  return valid;
}

function validatePolicies(policies: unknown[]): AgentModelPolicy[] {
  const valid: AgentModelPolicy[] = [];
  const invalid: unknown[] = [];
  for (const p of policies) {
    if (isAgentModelPolicy(p)) valid.push(p);
    else invalid.push(p);
  }
  if (invalid.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[modelSupportRegistry] Dropping ${invalid.length} invalid agent policy(ies)`);
  }
  return valid;
}

export function createModelRegistry(payload: {
  version?: string;
  updatedAt?: string;
  models: unknown[];
}): ModelRegistry {
  return {
    version: typeof payload.version === 'string' ? payload.version : '0.0.0',
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
    models: validateModels(payload.models),
  };
}

export function createRuntimeRegistry(payload: {
  version?: string;
  updatedAt?: string;
  runtimes: unknown[];
}): RuntimeRegistry {
  return {
    version: typeof payload.version === 'string' ? payload.version : '0.0.0',
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
    runtimes: validateRuntimes(payload.runtimes),
  };
}

export function createAgentPolicyRegistry(payload: {
  version?: string;
  updatedAt?: string;
  policies: unknown[];
}): AgentPolicyRegistry {
  return {
    version: typeof payload.version === 'string' ? payload.version : '0.0.0',
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
    policies: validatePolicies(payload.policies),
  };
}

export function findModelById(registry: ModelRegistry, id: string): SupportedModelProfile | undefined {
  return registry.models.find((m) => m.id === id);
}

export function findModelsByFamily(
  registry: ModelRegistry,
  family: string
): SupportedModelProfile[] {
  return registry.models.filter((m) => m.family.toLowerCase() === family.toLowerCase());
}

export function findModelsByProviderModelId(
  registry: ModelRegistry,
  providerModelId: string
): SupportedModelProfile[] {
  return registry.models.filter((m) =>
    m.providerModelIds.some(
      (id) => id.toLowerCase() === providerModelId.toLowerCase()
    )
  );
}

export function findRuntimeById(
  registry: RuntimeRegistry,
  id: string
): ProviderRuntimeProfile | undefined {
  return registry.runtimes.find((r) => r.id === id);
}

export function findRuntimeByType(
  registry: RuntimeRegistry,
  type: ProviderRuntimeProfile['type']
): ProviderRuntimeProfile | undefined {
  return registry.runtimes.find((r) => r.type === type);
}

export function findAgentPolicy(
  registry: AgentPolicyRegistry,
  agentId: string
): AgentModelPolicy | undefined {
  return registry.policies.find((p) => p.agentId === agentId);
}
