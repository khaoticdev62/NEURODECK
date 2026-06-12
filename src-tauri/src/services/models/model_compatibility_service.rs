use crate::config::LlmConfig;
use crate::model_registry::SupportedModelProfile;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct ScoreOptions {
    pub host_memory_gb: Option<u32>,
    #[serde(default = "default_battery_mode")]
    pub battery_mode: bool,
    #[serde(default)]
    pub allow_heavy_models: bool,
    #[serde(default)]
    pub required_capabilities: Vec<String>,
}

fn default_battery_mode() -> bool {
    true
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModelCompatibilityScore {
    pub model_id: String,
    pub display_name: String,
    pub tier: String,
    pub score: i32,
    pub reasons: Vec<String>,
    pub warnings: Vec<String>,
    pub recommended_context_tokens: u32,
    pub recommended_batch_size: u32,
    pub recommended_gpu_layers: Option<u32>,
    pub allow_auto_load: bool,
    pub requires_user_opt_in: bool,
    pub installed: bool,
}

fn host_memory_gb() -> u32 {
    let mut sys = sysinfo::System::new_all();
    sys.refresh_memory();
    let bytes = sys.total_memory();
    ((bytes as f64) / 1024.0 / 1024.0 / 1024.0).round() as u32
}

pub fn score_model(
    profile: &SupportedModelProfile,
    installed: bool,
    options: &ScoreOptions,
) -> ModelCompatibilityScore {
    let host_memory_gb = options.host_memory_gb.unwrap_or_else(host_memory_gb).max(1);
    let mut reasons = Vec::new();
    let mut warnings = Vec::new();
    let mut score: i32 = 50;

    match profile.compatibility_tier.as_str() {
        "deck_default" => {
            score += 40;
            reasons.push("Steam Deck default tier".into());
        }
        "deck_balanced" => {
            score += 25;
            reasons.push("Steam Deck balanced tier".into());
        }
        "deck_heavy" => {
            score += 10;
            warnings.push("Heavy model: may thermal-throttle on battery".into());
        }
        "remote_or_docked_only" => {
            score -= 20;
            warnings.push("Too large for comfortable local use; remote or docked recommended".into());
        }
        "unsupported" => {
            score -= 50;
            warnings.push("Unsupported on Steam Deck".into());
        }
        _ => {
            score -= 30;
            warnings.push("Compatibility unknown".into());
        }
    }

    if installed {
        score += 10;
        reasons.push("Model is installed locally".into());
    }

    match profile.parameter_class.as_str() {
        "sub_1b" | "1b" | "1_5b" | "2b" | "3b" => {
            score += 10;
            reasons.push(format!("Small parameter class ({})", profile.parameter_class));
        }
        "7b" | "8b" => {
            score -= 10;
            warnings.push("Medium-large model may exceed comfortable Deck RAM".into());
        }
        "unknown" => {
            // leave neutral
        }
        _ => {
            score -= 20;
            warnings.push("Large model not recommended for handheld use".into());
        }
    }

    if options.battery_mode && profile.steam_deck_policy.expected_thermal_pressure != "low" {
        score -= 10;
        warnings.push(format!(
            "Expected thermal pressure: {}",
            profile.steam_deck_policy.expected_thermal_pressure
        ));
    }

    if host_memory_gb < 16 && profile.steam_deck_policy.expected_memory_pressure == "high" {
        score -= 10;
        warnings.push("High memory pressure on low-memory host".into());
    }

    if profile.compatibility_tier == "deck_heavy" && !options.allow_heavy_models {
        score -= 15;
        warnings.push("Heavy model opt-in required".into());
    }

    score = score.clamp(0, 100);

    ModelCompatibilityScore {
        model_id: profile.id.clone(),
        display_name: profile.display_name.clone(),
        tier: profile.compatibility_tier.clone(),
        score,
        reasons,
        warnings,
        recommended_context_tokens: profile
            .steam_deck_policy
            .max_recommended_context_tokens
            .min(128_000),
        recommended_batch_size: 1,
        recommended_gpu_layers: if profile.parameter_class == "sub_1b" {
            Some(33)
        } else {
            None
        },
        allow_auto_load: profile.compatibility_tier == "deck_default"
            || (profile.compatibility_tier == "deck_balanced" && installed),
        requires_user_opt_in: profile.steam_deck_policy.requires_opt_in
            || profile.compatibility_tier == "deck_heavy",
        installed,
    }
}

fn has_all_capabilities(profile: &SupportedModelProfile, required: &[String]) -> bool {
    required.iter().all(|cap| profile.capabilities.contains(cap))
}

pub async fn get_model_compatibility_scores(
    options: &ScoreOptions,
    config: &LlmConfig,
) -> Vec<ModelCompatibilityScore> {
    let profiles = crate::model_registry::load_supported_models();
    let discovered = super::discover_installed_models(config).await;
    let installed_ids: HashSet<String> = discovered
        .into_iter()
        .filter_map(|d| d.registry_model_id)
        .collect();

    profiles
        .into_iter()
        .map(|profile| {
            let installed = installed_ids.contains(&profile.id);
            score_model(&profile, installed, options)
        })
        .collect()
}

pub async fn pick_best_local_model(
    options: &ScoreOptions,
    config: &LlmConfig,
) -> Option<ModelCompatibilityScore> {
    let profiles = crate::model_registry::load_supported_models();
    let discovered = super::discover_installed_models(config).await;
    let installed_ids: HashSet<String> = discovered
        .into_iter()
        .filter_map(|d| d.registry_model_id)
        .collect();

    let mut scored: Vec<ModelCompatibilityScore> = profiles
        .into_iter()
        .filter(|p| p.steam_deck_policy.allowed_local)
        .filter(|p| has_all_capabilities(p, &options.required_capabilities))
        .map(|p| {
            let installed = installed_ids.contains(&p.id);
            score_model(&p, installed, options)
        })
        .collect();

    scored.sort_by(|a, b| b.score.cmp(&a.score));
    scored.into_iter().next()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_profile(id: &str, tier: &str, parameter_class: &str) -> SupportedModelProfile {
        SupportedModelProfile {
            id: id.to_string(),
            family: "test".to_string(),
            display_name: format!("Test {}", id),
            provider_model_ids: vec![id.to_string()],
            parameter_class: parameter_class.to_string(),
            recommended_quantization: "Q4_K_M".to_string(),
            compatibility_tier: tier.to_string(),
            capabilities: vec!["chat".to_string()],
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
    fn deck_default_scores_higher_than_unsupported() {
        let options = ScoreOptions::default();
        let default_score = score_model(&sample_profile("a", "deck_default", "1b"), false, &options);
        let unsupported_score = score_model(&sample_profile("b", "unsupported", "30b_plus"), false, &options);
        assert!(
            default_score.score > unsupported_score.score,
            "default should outrank unsupported"
        );
    }

    #[test]
    fn installed_bonus_increases_score() {
        let profile = sample_profile("a", "deck_balanced", "3b");
        let options = ScoreOptions::default();
        let not_installed = score_model(&profile, false, &options);
        let installed = score_model(&profile, true, &options);
        assert!(installed.score > not_installed.score);
        assert!(installed.reasons.iter().any(|r| r.contains("installed")));
    }

    #[test]
    fn heavy_model_requires_opt_in_when_not_allowed() {
        let profile = sample_profile("a", "deck_heavy", "7b");
        let mut options = ScoreOptions::default();
        options.allow_heavy_models = false;
        let score = score_model(&profile, false, &options);
        assert!(score.requires_user_opt_in);
        assert!(score.warnings.iter().any(|w| w.contains("opt-in")));
    }
}
