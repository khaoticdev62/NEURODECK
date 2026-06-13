use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Curated model profile loaded from `assets/model-registry/supported-models.json`.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SupportedModelProfile {
    pub id: String,
    pub family: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    #[serde(rename = "providerModelIds")]
    pub provider_model_ids: Vec<String>,
    #[serde(rename = "parameterClass")]
    pub parameter_class: String,
    #[serde(rename = "recommendedQuantization")]
    pub recommended_quantization: String,
    #[serde(rename = "compatibilityTier")]
    pub compatibility_tier: String,
    pub capabilities: Vec<String>,
    #[serde(rename = "steamDeckPolicy")]
    pub steam_deck_policy: SteamDeckPolicy,
    #[serde(rename = "healthRequirements")]
    pub health_requirements: HealthRequirements,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SteamDeckPolicy {
    #[serde(rename = "allowedLocal")]
    pub allowed_local: bool,
    #[serde(rename = "defaultLocal")]
    pub default_local: bool,
    #[serde(rename = "requiresOptIn")]
    pub requires_opt_in: bool,
    #[serde(rename = "remoteRecommended")]
    pub remote_recommended: bool,
    #[serde(rename = "maxRecommendedContextTokens")]
    pub max_recommended_context_tokens: u32,
    #[serde(rename = "expectedMemoryPressure")]
    pub expected_memory_pressure: String,
    #[serde(rename = "expectedThermalPressure")]
    pub expected_thermal_pressure: String,
    pub notes: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HealthRequirements {
    #[serde(rename = "providerMustListModel")]
    pub provider_must_list_model: bool,
    #[serde(rename = "mustPassTinyPrompt")]
    pub must_pass_tiny_prompt: bool,
    #[serde(rename = "mustSupportStreaming")]
    pub must_support_streaming: Option<bool>,
    #[serde(rename = "mustSupportTools")]
    pub must_support_tools: Option<bool>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AgentModelPolicy {
    #[serde(rename = "agentId")]
    pub agent_id: String,
    #[serde(rename = "preferredModels")]
    pub preferred_models: Vec<String>,
    #[serde(rename = "allowedModelCapabilities")]
    pub allowed_model_capabilities: Vec<String>,
    #[serde(rename = "blockedModelFamilies")]
    pub blocked_model_families: Vec<String>,
    #[serde(rename = "minimumCompatibilityTier")]
    pub minimum_compatibility_tier: String,
    #[serde(rename = "allowHeavyModels")]
    pub allow_heavy_models: bool,
    #[serde(rename = "allowRemoteFallback")]
    pub allow_remote_fallback: bool,
}

pub fn registry_path(name: &str) -> PathBuf {
    if let Ok(dir) = std::env::var("NEURODECK_ASSETS_DIR") {
        return Path::new(&dir).join("model-registry").join(name);
    }

    // Workspace root layout (repo root / assets/model-registry).
    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let workspace = Path::new(&manifest_dir)
            .join("../assets/model-registry")
            .join(name);
        if workspace.exists() {
            return workspace;
        }
    }

    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let repo = cwd.join("assets/model-registry").join(name);
    if repo.exists() {
        return repo;
    }
    // Running from src-tauri subdirectory (tests).
    let parent = cwd.join("../assets/model-registry").join(name);
    if parent.exists() {
        return parent;
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let packaged = dir.join("assets/model-registry").join(name);
            if packaged.exists() {
                return packaged;
            }
        }
    }

    repo
}

pub fn load_supported_models() -> Vec<SupportedModelProfile> {
    let path = registry_path("supported-models.json");
    if !path.exists() {
        tracing::warn!("Supported models registry not found at {}", path.display());
        return Vec::new();
    }
    match std::fs::read_to_string(&path) {
        Ok(text) => match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(val) => {
                let entries = val
                    .get("models")
                    .and_then(|m| m.as_array())
                    .cloned()
                    .unwrap_or_default();
                entries
                    .into_iter()
                    .filter_map(|entry| {
                        match serde_json::from_value::<SupportedModelProfile>(entry) {
                            Ok(p) => Some(p),
                            Err(e) => {
                                tracing::warn!("Dropping invalid model profile in registry: {}", e);
                                None
                            }
                        }
                    })
                    .collect()
            }
            Err(e) => {
                tracing::warn!("Failed to parse supported models registry: {}", e);
                Vec::new()
            }
        },
        Err(e) => {
            tracing::warn!("Failed to read supported models registry: {}", e);
            Vec::new()
        }
    }
}

pub fn load_agent_policies() -> Vec<AgentModelPolicy> {
    let path = registry_path("agent-policies.json");
    if !path.exists() {
        tracing::warn!("Agent policy registry not found at {}", path.display());
        return Vec::new();
    }
    match std::fs::read_to_string(&path) {
        Ok(text) => match serde_json::from_str::<serde_json::Value>(&text) {
            Ok(val) => {
                let entries = val
                    .get("policies")
                    .and_then(|p| p.as_array())
                    .cloned()
                    .unwrap_or_default();
                entries
                    .into_iter()
                    .filter_map(
                        |entry| match serde_json::from_value::<AgentModelPolicy>(entry) {
                            Ok(p) => Some(p),
                            Err(e) => {
                                tracing::warn!("Dropping invalid agent policy in registry: {}", e);
                                None
                            }
                        },
                    )
                    .collect()
            }
            Err(e) => {
                tracing::warn!("Failed to parse agent policy registry: {}", e);
                Vec::new()
            }
        },
        Err(e) => {
            tracing::warn!("Failed to read agent policy registry: {}", e);
            Vec::new()
        }
    }
}

/// Infer a display provider label from a model profile.
/// The registry intentionally does not hardcode a provider per model; we derive
/// a coarse label for UIs that still expect one.
pub fn provider_label(profile: &SupportedModelProfile) -> &'static str {
    if profile.compatibility_tier == "unsupported" || profile.compatibility_tier == "unknown" {
        return "disabled";
    }
    if profile.steam_deck_policy.remote_recommended {
        return "gemini";
    }
    "ollama"
}

pub fn tier_label(profile: &SupportedModelProfile) -> String {
    match profile.compatibility_tier.as_str() {
        "deck_default" => "local-fast".to_string(),
        "deck_balanced" => "local-balanced".to_string(),
        "deck_heavy" => "local-smart".to_string(),
        "remote_or_docked_only" => "remote".to_string(),
        "unsupported" => "unsupported".to_string(),
        _ => "unknown".to_string(),
    }
}

/// Rough vRAM estimate in MB from parameter class. Returns 0 when unknown.
pub fn vram_mb_estimate(profile: &SupportedModelProfile) -> u32 {
    match profile.parameter_class.as_str() {
        "sub_1b" => 700,
        "1b" => 900,
        "1_5b" => 1200,
        "2b" => 1600,
        "3b" => 2000,
        "4b" => 2500,
        "7b" => 4800,
        "8b" => 5200,
        "12b" => 7800,
        "14b" => 9000,
        "27b" => 18000,
        "30b_plus" => 0,
        _ => 0,
    }
}

pub fn steam_deck_ok(profile: &SupportedModelProfile) -> bool {
    matches!(
        profile.compatibility_tier.as_str(),
        "deck_default" | "deck_balanced" | "deck_heavy"
    )
}
