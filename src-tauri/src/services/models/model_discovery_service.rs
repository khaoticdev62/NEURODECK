use super::provider_health_service::{check_all_provider_health, ProviderConnectionState};
use crate::config::LlmConfig;
use crate::model_registry::SupportedModelProfile;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DiscoveredModelEntry {
    pub runtime_id: String,
    pub runtime_type: String,
    pub runtime_label: String,
    pub model_id: String,
    pub registry_model_id: Option<String>,
    pub display_name: String,
    pub family: Option<String>,
    pub compatibility_tier: String,
    pub capabilities: Vec<String>,
    pub state: ProviderConnectionState,
    pub latency_ms: u64,
}

fn build_profile_index(
    profiles: &[SupportedModelProfile],
) -> HashMap<String, &SupportedModelProfile> {
    let mut index: HashMap<String, &SupportedModelProfile> = HashMap::new();
    for profile in profiles {
        index.insert(profile.id.clone(), profile);
        for model_id in &profile.provider_model_ids {
            index.insert(model_id.clone(), profile);
        }
    }
    index
}

fn fuzzy_match_profile<'a>(
    model_id: &str,
    index: &HashMap<String, &'a SupportedModelProfile>,
) -> Option<&'a SupportedModelProfile> {
    // Exact match on providerModelId or registry id.
    if let Some(profile) = index.get(model_id) {
        return Some(*profile);
    }
    // Substring match against registry ids and provider model ids.
    index
        .values()
        .find(|profile| {
            model_id.contains(&profile.id)
                || profile
                    .provider_model_ids
                    .iter()
                    .any(|m| model_id.contains(m))
        })
        .copied()
}

pub async fn discover_installed_models(config: &LlmConfig) -> Vec<DiscoveredModelEntry> {
    let profiles = crate::model_registry::load_supported_models();
    let index = build_profile_index(&profiles);
    let health_results = check_all_provider_health(config).await;

    let mut entries = Vec::new();
    for health in health_results {
        for model_id in &health.models {
            let profile = fuzzy_match_profile(model_id, &index);
            entries.push(DiscoveredModelEntry {
                runtime_id: health.runtime_id.clone(),
                runtime_type: health.runtime_type.clone(),
                runtime_label: health.label.clone(),
                model_id: model_id.clone(),
                registry_model_id: profile.map(|p| p.id.clone()),
                display_name: profile
                    .map(|p| p.display_name.clone())
                    .unwrap_or_else(|| model_id.clone()),
                family: profile.map(|p| p.family.clone()),
                compatibility_tier: profile
                    .map(|p| p.compatibility_tier.clone())
                    .unwrap_or_else(|| "unknown".to_string()),
                capabilities: profile.map(|p| p.capabilities.clone()).unwrap_or_default(),
                state: health.state.clone(),
                latency_ms: health.latency_ms,
            });
        }
    }
    entries
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_profile(id: &str, model_ids: &[&str]) -> SupportedModelProfile {
        SupportedModelProfile {
            id: id.to_string(),
            family: "test".to_string(),
            display_name: format!("Test {}", id),
            provider_model_ids: model_ids.iter().map(|s| s.to_string()).collect(),
            parameter_class: "1b".to_string(),
            recommended_quantization: "Q4_K_M".to_string(),
            compatibility_tier: "deck_default".to_string(),
            capabilities: vec!["chat".to_string()],
            steam_deck_policy: crate::model_registry::SteamDeckPolicy {
                allowed_local: true,
                default_local: true,
                requires_opt_in: false,
                remote_recommended: false,
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
    fn exact_provider_model_id_match() {
        let profiles = vec![sample_profile("llama32-1b", &["llama3.2:1b"])];
        let index = build_profile_index(&profiles);
        let matched = fuzzy_match_profile("llama3.2:1b", &index);
        assert!(matched.is_some());
        assert_eq!(matched.unwrap().id, "llama32-1b");
    }

    #[test]
    fn unknown_model_returns_none() {
        let profiles = vec![sample_profile("llama32-1b", &["llama3.2:1b"])];
        let index = build_profile_index(&profiles);
        assert!(fuzzy_match_profile("some-random-model", &index).is_none());
    }
}
