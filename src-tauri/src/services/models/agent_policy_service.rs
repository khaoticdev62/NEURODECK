use crate::config::LlmConfig;
use crate::model_registry::AgentModelPolicy;
use serde::{Deserialize, Serialize};

const TIER_ORDER: &[&str] = &[
    "deck_default",
    "deck_balanced",
    "deck_heavy",
    "remote_or_docked_only",
    "unsupported",
    "unknown",
];

fn tier_rank(tier: &str) -> usize {
    TIER_ORDER.iter().position(|t| *t == tier).unwrap_or(99)
}

fn is_tier_at_least(tier: &str, minimum: &str) -> bool {
    tier_rank(tier) <= tier_rank(minimum)
}

pub fn load_agent_policies() -> Vec<AgentModelPolicy> {
    crate::model_registry::load_agent_policies()
}

pub fn get_policy_for_agent(agent_id: &str) -> Option<AgentModelPolicy> {
    load_agent_policies()
        .into_iter()
        .find(|p| p.agent_id == agent_id)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AgentModelAllowance {
    pub allowed: bool,
    pub reason: String,
    pub tier_ok: bool,
    pub capabilities_ok: bool,
    pub family_ok: bool,
    pub heavy_ok: bool,
    pub remote_ok: bool,
}

pub fn evaluate_policy_for_model(
    policy: &AgentModelPolicy,
    profile: &crate::model_registry::SupportedModelProfile,
) -> AgentModelAllowance {
    let tier_ok = is_tier_at_least(
        &profile.compatibility_tier,
        &policy.minimum_compatibility_tier,
    );
    let capabilities_ok = policy
        .allowed_model_capabilities
        .iter()
        .all(|cap| profile.capabilities.contains(cap));
    let family_ok = !policy.blocked_model_families.contains(&profile.family);
    let heavy_ok = profile.compatibility_tier != "deck_heavy" || policy.allow_heavy_models;
    let remote_ok = !profile.steam_deck_policy.remote_recommended || policy.allow_remote_fallback;

    let allowed = tier_ok && capabilities_ok && family_ok && heavy_ok && remote_ok;
    let mut reason = String::new();
    if allowed {
        reason.push_str("Model meets agent policy");
    } else {
        let mut issues = Vec::new();
        if !tier_ok {
            issues.push(format!(
                "tier {} below minimum {}",
                profile.compatibility_tier, policy.minimum_compatibility_tier
            ));
        }
        if !capabilities_ok {
            let missing: Vec<&String> = policy
                .allowed_model_capabilities
                .iter()
                .filter(|cap| !profile.capabilities.contains(cap))
                .collect();
            issues.push(format!("missing capabilities: {:?}", missing));
        }
        if !family_ok {
            issues.push(format!("family '{}' is blocked", profile.family));
        }
        if !heavy_ok {
            issues.push("heavy models not allowed".into());
        }
        if !remote_ok {
            issues.push("remote fallback not allowed".into());
        }
        reason = format!("Policy violation: {}", issues.join("; "));
    }

    AgentModelAllowance {
        allowed,
        reason,
        tier_ok,
        capabilities_ok,
        family_ok,
        heavy_ok,
        remote_ok,
    }
}

pub fn is_model_allowed_for_agent(
    agent_id: &str,
    profile: &crate::model_registry::SupportedModelProfile,
) -> bool {
    get_policy_for_agent(agent_id)
        .map(|policy| evaluate_policy_for_model(&policy, profile).allowed)
        .unwrap_or(true)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AgentScoredModel {
    #[serde(flatten)]
    pub score: super::model_compatibility_service::ModelCompatibilityScore,
    pub agent_preferred: bool,
    pub policy_allowed: bool,
    pub policy_reason: String,
}

pub async fn rank_models_for_agent(
    agent_id: &str,
    options: &super::model_compatibility_service::ScoreOptions,
    config: &LlmConfig,
) -> Vec<AgentScoredModel> {
    let policy = get_policy_for_agent(agent_id);
    let scored =
        super::model_compatibility_service::get_model_compatibility_scores(options, config).await;
    let profiles = crate::model_registry::load_supported_models();
    let profile_by_id: std::collections::HashMap<
        String,
        &crate::model_registry::SupportedModelProfile,
    > = profiles.iter().map(|p| (p.id.clone(), p)).collect();

    let preferred: std::collections::HashSet<String> = policy
        .as_ref()
        .map(|p| p.preferred_models.iter().cloned().collect())
        .unwrap_or_default();

    let mut result: Vec<AgentScoredModel> = scored
        .into_iter()
        .map(|score| {
            let allowance = profile_by_id
                .get(&score.model_id)
                .map(|profile| {
                    policy
                        .as_ref()
                        .map(|p| evaluate_policy_for_model(p, profile))
                        .unwrap_or_else(|| AgentModelAllowance {
                            allowed: true,
                            reason: "No agent policy".into(),
                            tier_ok: true,
                            capabilities_ok: true,
                            family_ok: true,
                            heavy_ok: true,
                            remote_ok: true,
                        })
                })
                .unwrap_or_else(|| AgentModelAllowance {
                    allowed: false,
                    reason: "Model not in registry".into(),
                    tier_ok: false,
                    capabilities_ok: false,
                    family_ok: false,
                    heavy_ok: false,
                    remote_ok: false,
                });

            AgentScoredModel {
                agent_preferred: preferred.contains(&score.model_id),
                policy_allowed: allowance.allowed,
                policy_reason: allowance.reason,
                score,
            }
        })
        .collect();

    // Boost preferred models, then by score, then by policy-allowed.
    result.sort_by(|a, b| {
        let preferred_order = b.agent_preferred.cmp(&a.agent_preferred);
        if preferred_order != std::cmp::Ordering::Equal {
            return preferred_order;
        }
        let allowed_order = b.policy_allowed.cmp(&a.policy_allowed);
        if allowed_order != std::cmp::Ordering::Equal {
            return allowed_order;
        }
        b.score.score.cmp(&a.score.score)
    });
    result
}

pub async fn pick_best_model_for_agent(
    agent_id: &str,
    options: &super::model_compatibility_service::ScoreOptions,
    config: &LlmConfig,
) -> Option<AgentScoredModel> {
    rank_models_for_agent(agent_id, options, config)
        .await
        .into_iter()
        .find(|m| m.policy_allowed && m.score.score > 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_policy() -> AgentModelPolicy {
        AgentModelPolicy {
            agent_id: "test".to_string(),
            preferred_models: vec!["llama32-1b".to_string()],
            allowed_model_capabilities: vec!["chat".to_string(), "completion".to_string()],
            blocked_model_families: vec!["bad".to_string()],
            minimum_compatibility_tier: "deck_default".to_string(),
            allow_heavy_models: false,
            allow_remote_fallback: false,
        }
    }

    fn make_profile(
        id: &str,
        tier: &str,
        family: &str,
        capabilities: &[&str],
    ) -> crate::model_registry::SupportedModelProfile {
        crate::model_registry::SupportedModelProfile {
            id: id.to_string(),
            family: family.to_string(),
            display_name: id.to_string(),
            provider_model_ids: vec![id.to_string()],
            parameter_class: "1b".to_string(),
            recommended_quantization: "Q4_K_M".to_string(),
            compatibility_tier: tier.to_string(),
            capabilities: capabilities.iter().map(|c| c.to_string()).collect(),
            steam_deck_policy: crate::model_registry::SteamDeckPolicy {
                allowed_local: true,
                default_local: tier == "deck_default",
                requires_opt_in: tier == "deck_heavy",
                remote_recommended: tier == "remote_or_docked_only",
                max_recommended_context_tokens: 8192,
                expected_memory_pressure: "low".to_string(),
                expected_thermal_pressure: "low".to_string(),
                notes: vec![],
            },
            health_requirements: crate::model_registry::HealthRequirements {
                provider_must_list_model: true,
                must_pass_tiny_prompt: true,
                must_support_streaming: Some(true),
                must_support_tools: None,
            },
        }
    }

    #[test]
    fn allows_compliant_model() {
        let policy = make_policy();
        let profile = make_profile(
            "llama32-1b",
            "deck_default",
            "llama",
            &["chat", "completion"],
        );
        let result = evaluate_policy_for_model(&policy, &profile);
        assert!(result.allowed);
    }

    #[test]
    fn rejects_insufficient_tier() {
        let policy = make_policy();
        let profile = make_profile(
            "x",
            "remote_or_docked_only",
            "llama",
            &["chat", "completion"],
        );
        let result = evaluate_policy_for_model(&policy, &profile);
        assert!(!result.allowed);
        assert!(!result.tier_ok);
    }

    #[test]
    fn rejects_missing_capability() {
        let policy = make_policy();
        let profile = make_profile("x", "deck_default", "llama", &["chat"]);
        let result = evaluate_policy_for_model(&policy, &profile);
        assert!(!result.allowed);
        assert!(!result.capabilities_ok);
    }

    #[test]
    fn rejects_blocked_family() {
        let policy = make_policy();
        let profile = make_profile("x", "deck_default", "bad", &["chat", "completion"]);
        let result = evaluate_policy_for_model(&policy, &profile);
        assert!(!result.allowed);
        assert!(!result.family_ok);
    }

    #[test]
    fn rejects_remote_without_fallback() {
        let policy = make_policy();
        let profile = make_profile(
            "x",
            "remote_or_docked_only",
            "llama",
            &["chat", "completion"],
        );
        let result = evaluate_policy_for_model(&policy, &profile);
        assert!(!result.allowed);
        assert!(!result.remote_ok);
    }
}
