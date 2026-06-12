# Phase 6 — Agent/Model Policy Enforcement

## Status

**Complete.** Agent policy loading, model allowance evaluation, agent-aware ranking, and recovery integration are implemented and green.

## What was built

| File | Responsibility |
|---|---|
| `src-tauri/src/services/models/agent_policy_service.rs` | Loads `agent-policies.json`, evaluates whether a model is allowed for an agent, ranks models with preferred-model boosting, and picks the best policy-compliant model. |
| `src-tauri/src/services/models/mod.rs` | Re-exports policy helpers. |
| `src-tauri/src/services/models/model_recovery_service.rs` | Updated failover/downgrade logic to respect agent policy when `agentId` is supplied. |
| `src-tauri/src/commands/mod.rs` | New bridge commands: `get_agent_model_policies`, `get_allowed_models_for_agent`, `validate_agent_model`. |

## Policy rules

For each agent policy (`agentId`, `minimumCompatibilityTier`, `allowedModelCapabilities`, `blockedModelFamilies`, `allowHeavyModels`, `allowRemoteFallback`):

- Model tier must be ≥ `minimumCompatibilityTier`.
- Model must have all `allowedModelCapabilities`.
- Model family must not be in `blockedModelFamilies`.
- `deck_heavy` models require `allowHeavyModels: true`.
- `remote_recommended` models require `allowRemoteFallback: true`.

## Agent-aware ranking

`rank_models_for_agent(agentId, options, config)` returns compatibility scores annotated with:
- `agent_preferred` — model is in the agent's `preferredModels` list.
- `policy_allowed` — model passes all policy checks.
- `policy_reason` — explanation when blocked.

Sort order:
1. Preferred models first.
2. Policy-allowed models next.
3. Highest compatibility score.

## Recovery integration

When `evaluate_recovery` receives an `agentId`, failover and downgrade targets are filtered by agent policy. This prevents recovery from silently switching a privacy-sensitive agent to a remote provider or a model missing required capabilities.

## Bridge commands

- `get_agent_model_policies` — returns all policies from `assets/model-registry/agent-policies.json`.
- `get_allowed_models_for_agent` — `{ agentId, ...scoreOptions }` → ranked `AgentScoredModel` list.
- `validate_agent_model` — `{ agentId, modelId }` → `AgentModelAllowance` with detailed pass/fail flags.

## Verification

- `cargo test --manifest-path src-tauri/Cargo.toml --lib` ✅ — 137 tests passed (5 new policy tests)
- `npm run verify:model-support` ✅
- `npm run verify:no-production-mocks` ✅
- `npm run frontend:build` ✅

## Notes / next steps for Phase 7

- Wire agent policy checks into the model selector UI so disallowed models are hidden or shown with a warning.
- Enforce policy at chat invocation time (reject/send warning if active agent + selected model violate policy).
- Add UI diagnostics panel for recovery events.
