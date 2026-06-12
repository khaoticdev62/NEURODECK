use std::sync::Arc;

use crate::config;
use crate::llm::{
    GeminiProvider, HuggingFaceProvider, KimiProvider, LlmProvider, OllamaProvider,
    OpenAICompatProvider,
};

/// Build the default LLM provider from the active config.
pub(crate) fn create_provider(config: &config::Config) -> Arc<dyn LlmProvider> {
    // User-configured default_provider takes precedence over env vars.
    // The GEMINI_API_KEY env var is only a key source, not a provider selector.
    match config.llm.default_provider.as_str() {
        "gemini" => Arc::new(GeminiProvider::new(config.llm.gemini_model.clone())),
        "huggingface" => Arc::new(HuggingFaceProvider::new(
            config.llm.hf_model.clone(),
            None,
            config.llm.hf_base_url.clone(),
            config.llm.hf_embed_model.clone(),
        )),
        "kimi" => Arc::new(KimiProvider::new(
            config.llm.kimi_model.clone(),
            config.llm.kimi_base_url.clone(),
        )),
        "openai_compat" => {
            let api_key =
                neurodeck_infrastructure::secrets::get_openai_compat_api_key().unwrap_or_default();
            Arc::new(OpenAICompatProvider::new(
                config.llm.openai_compat_base_url.clone(),
                config.llm.openai_compat_model.clone(),
                api_key,
            ))
        }
        _ => Arc::new(OllamaProvider::new(
            config.llm.ollama_model.clone(),
            config.llm.ollama_base_url.clone(),
            config.llm.ollama_embed_model.clone(),
        )),
    }
}

/// Build a provider Arc directly from an AgentConfig.
pub(crate) fn provider_from_agent(agent: &config::AgentConfig) -> Arc<dyn LlmProvider> {
    match agent.provider.as_str() {
        "gemini" => Arc::new(GeminiProvider::new(agent.model.clone())),
        "huggingface" => Arc::new(HuggingFaceProvider::new(
            agent.model.clone(),
            None,
            agent.base_url.clone(),
            agent.embed_model.clone(),
        )),
        "kimi" => Arc::new(KimiProvider::new(
            agent.model.clone(),
            agent.base_url.clone(),
        )),
        "openai_compat" => {
            let api_key =
                neurodeck_infrastructure::secrets::get_openai_compat_api_key().unwrap_or_default();
            Arc::new(OpenAICompatProvider::new(
                agent.base_url.clone(),
                agent.model.clone(),
                api_key,
            ))
        }
        _ => Arc::new(OllamaProvider::new(
            agent.model.clone(),
            agent.base_url.clone(),
            agent.embed_model.clone(),
        )),
    }
}

/// Build a provider Arc for an explicit provider/model pair, falling back to
/// config defaults for base URL / embed model / API keys.
pub(crate) fn provider_for(
    provider: &str,
    model: &str,
    config: &config::Config,
) -> Arc<dyn LlmProvider> {
    match provider {
        "gemini" => Arc::new(GeminiProvider::new(model.to_string())),
        "huggingface" => Arc::new(HuggingFaceProvider::new(
            model.to_string(),
            None,
            config.llm.hf_base_url.clone(),
            config.llm.hf_embed_model.clone(),
        )),
        "kimi" => Arc::new(KimiProvider::new(
            model.to_string(),
            config.llm.kimi_base_url.clone(),
        )),
        "openai_compat" => {
            let api_key =
                neurodeck_infrastructure::secrets::get_openai_compat_api_key().unwrap_or_default();
            Arc::new(OpenAICompatProvider::new(
                config.llm.openai_compat_base_url.clone(),
                model.to_string(),
                api_key,
            ))
        }
        "lmstudio" => Arc::new(OpenAICompatProvider::new(
            config.llm.lm_studio_base_url.clone(),
            model.to_string(),
            String::new(),
        )),
        "llama_cpp" => Arc::new(OpenAICompatProvider::new(
            config.llm.llamacpp_base_url.clone(),
            model.to_string(),
            String::new(),
        )),
        _ => Arc::new(OllamaProvider::new(
            model.to_string(),
            config.llm.ollama_base_url.clone(),
            config.llm.ollama_embed_model.clone(),
        )),
    }
}

/// Seed default agent profiles from the runtime model registry when none exist in config.
pub(crate) fn default_agents() -> Vec<config::AgentConfig> {
    use std::collections::HashMap;

    let profiles = crate::model_registry::load_supported_models();
    let policies = crate::model_registry::load_agent_policies();

    let mut model_by_id: HashMap<String, &crate::model_registry::SupportedModelProfile> =
        HashMap::new();
    for profile in &profiles {
        model_by_id.insert(profile.id.clone(), profile);
        for model_id in &profile.provider_model_ids {
            model_by_id.insert(model_id.clone(), profile);
        }
    }

    policies
        .into_iter()
        .filter_map(|policy| {
            let profile = policy
                .preferred_models
                .iter()
                .find_map(|id| model_by_id.get(id).copied())?;
            let provider = crate::model_registry::provider_label(profile).to_string();
            let base_url = match provider.as_str() {
                "ollama" => "http://localhost:11434".to_string(),
                "huggingface" => "https://api-inference.huggingface.co".to_string(),
                _ => String::new(),
            };
            Some(config::AgentConfig {
                id: policy.agent_id.clone(),
                name: profile.display_name.clone(),
                provider,
                model: profile
                    .provider_model_ids
                    .first()
                    .cloned()
                    .unwrap_or_else(|| profile.id.clone()),
                base_url,
                embed_model: String::new(),
                description: profile
                    .steam_deck_policy
                    .notes
                    .first()
                    .cloned()
                    .unwrap_or_else(|| format!("{} agent", policy.agent_id)),
            })
        })
        .collect()
}
